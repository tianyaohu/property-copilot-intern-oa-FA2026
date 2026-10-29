import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { GEO_INDEX, getDocClient, tableName } from "./db";
import {
  boundingBoxPrefixes,
  encodeGeohash,
  estimatePrefixCount,
  geohashPrefix,
  isInBoundingBox,
  type BoundingBox
} from "./geo";
import type { Property } from "./types";

// Fan-out guard, sized from measurement rather than guesswork: a realistic
// full-Metro-Vancouver viewport estimates to ~726 prefix cells and a typical
// initial view ~112, both inside the cap. The map deliberately has no zoom-out
// limit, so this guard is the real limiter for world-scale viewports (which
// estimate to ~33M cells) — for the frontend and raw API callers alike.
export const MAX_PREFIXES = 800;

/** Raised before any DynamoDB work when a bbox would fan out too widely. */
export class ViewportTooLargeError extends Error {
  constructor(estimatedPrefixes: number) {
    super(
      `Viewport too large: ~${estimatedPrefixes} geohash partitions (max ${MAX_PREFIXES})`
    );
    this.name = "ViewportTooLargeError";
  }
}

/** Compute the geo index attributes for an item from its coordinates. */
export function withGeoAttributes(
  property: Omit<Property, "geohash" | "geohashPrefix">
): Property {
  const geohash = encodeGeohash(property.lat, property.lng);
  return { ...property, geohash, geohashPrefix: geohashPrefix(geohash) };
}

export async function putProperty(
  property: Omit<Property, "geohash" | "geohashPrefix">
): Promise<Property> {
  const item = withGeoAttributes(property);
  await getDocClient().send(new PutCommand({ TableName: tableName(), Item: item }));
  return item;
}

export async function getPropertyById(id: string): Promise<Property | null> {
  const result = await getDocClient().send(
    new GetCommand({ TableName: tableName(), Key: { id } })
  );
  return (result.Item as Property | undefined) ?? null;
}

export function refineToBox(items: Property[], box: BoundingBox): Property[] {
  return items.filter((item) => isInBoundingBox(item.lat, item.lng, box));
}

export function dedupeById(items: Property[]): Property[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

/**
 * Query one geo-index partition (a single geohash-prefix cell), following
 * LastEvaluatedKey — a ~4.9 km cell in a dense dataset can exceed DynamoDB's
 * 1 MB per-Query page.
 */
async function queryPrefix(prefix: string): Promise<Property[]> {
  const items: Property[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await getDocClient().send(
      new QueryCommand({
        TableName: tableName(),
        IndexName: GEO_INDEX,
        KeyConditionExpression: "geohashPrefix = :p",
        ExpressionAttributeValues: { ":p": prefix },
        ExclusiveStartKey: lastKey
      })
    );
    items.push(...((result.Items as Property[] | undefined) ?? []));
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return items;
}

/**
 * Geospatial viewport query. Turns the box into the geohash prefixes that
 * cover it, Queries those geo-index partitions in parallel (each paginated),
 * then trims the prefix-cell overhang back to the exact box. The fan-out
 * guard runs on an arithmetic estimate so hostile boxes are rejected before
 * any cell strings are allocated. Attribute filters and the result cap are
 * composed by the caller (search.ts) — filters first, then the cap.
 */
export async function queryByBoundingBox(box: BoundingBox): Promise<Property[]> {
  const estimated = estimatePrefixCount(box);
  if (estimated > MAX_PREFIXES) {
    throw new ViewportTooLargeError(estimated);
  }

  const started = Date.now();
  const prefixes = boundingBoxPrefixes(box);
  const perPrefix = await Promise.all(prefixes.map(queryPrefix));
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
