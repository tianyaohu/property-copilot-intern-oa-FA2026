import {
  boundingBoxPrefixes,
  encodeGeohash,
  estimatePrefixCount,
  geohashPrefix,
  isInBoundingBox,
  type BoundingBox
} from "./geo";
import { createDynamoPropertyStore, type PropertyStore } from "./property-store";
import type { Property } from "./types";

// Fan-out guard, sized from measurement rather than guesswork: a realistic
// full-Metro-Vancouver viewport estimates to ~726 prefix cells and a typical
// initial view ~112, both inside the cap. The map deliberately has no zoom-out
// limit, so this guard is the real limiter for world-scale viewports (which
// estimate to ~33M cells) — for the frontend and raw API callers alike.
export const MAX_PREFIXES = 800;

/** Raised before any store read when a bbox would fan out too widely. */
export class ViewportTooLargeError extends Error {
  constructor(estimatedPrefixes: number) {
    super(
      `Viewport too large: ~${estimatedPrefixes} geohash partitions (max ${MAX_PREFIXES})`
    );
    this.name = "ViewportTooLargeError";
  }
}

// Built once. Commands inside it read the table name and the client at send
// time, so a late PROPERTIES_TABLE / DYNAMODB_ENDPOINT still applies.
const dynamoStore = createDynamoPropertyStore();

function storeOrDefault(store?: PropertyStore): PropertyStore {
  return store ?? dynamoStore;
}

/** Compute the geo index attributes for an item from its coordinates. */
export function withGeoAttributes(
  property: Omit<Property, "geohash" | "geohashPrefix">
): Property {
  const geohash = encodeGeohash(property.lat, property.lng);
  return { ...property, geohash, geohashPrefix: geohashPrefix(geohash) };
}

/**
 * Persist a listing. Geo keys are derived here, before the store sees the
 * item, so a store implementation cannot write a row the geo index misses.
 * `store` defaults to DynamoDB.
 */
export async function putProperty(
  property: Omit<Property, "geohash" | "geohashPrefix">,
  store?: PropertyStore
): Promise<Property> {
  const item = withGeoAttributes(property);
  await storeOrDefault(store).put(item);
  return item;
}

/** Load one listing by id. `store` defaults to DynamoDB. */
export async function getPropertyById(
  id: string,
  store?: PropertyStore
): Promise<Property | null> {
  return storeOrDefault(store).getById(id);
}

export function refineToBox(items: Property[], box: BoundingBox): Property[] {
  return items.filter((item) => isInBoundingBox(item.lat, item.lng, box));
}

export function dedupeById(items: Property[]): Property[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

/**
 * Geospatial viewport query. Turns the box into the geohash prefixes that
 * cover it, reads those partitions in parallel (each store read follows its
 * own pages), then trims the prefix-cell overhang back to the exact box. The
 * fan-out guard runs on an arithmetic estimate so hostile boxes are rejected
 * before any cell strings are allocated and before the store is touched.
 * Attribute filters and the result cap are composed by the caller (search.ts)
 * — filters first, then the cap. `store` defaults to DynamoDB.
 */
export async function queryByBoundingBox(
  box: BoundingBox,
  store?: PropertyStore
): Promise<Property[]> {
  const estimated = estimatePrefixCount(box);
  if (estimated > MAX_PREFIXES) {
    throw new ViewportTooLargeError(estimated);
  }

  const started = Date.now();
  const prefixes = boundingBoxPrefixes(box);
  const reader = storeOrDefault(store);
  const perPrefix = await Promise.all(prefixes.map((prefix) => reader.readPartition(prefix)));
  const matches = refineToBox(dedupeById(perPrefix.flat()), box);

  console.log(
    JSON.stringify({
      msg: "queryByBoundingBox",
      prefixCount: prefixes.length,
      tookMs: Date.now() - started,
      matchCount: matches.length
    })
  );

  return matches;
}
