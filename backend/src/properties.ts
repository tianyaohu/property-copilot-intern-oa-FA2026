import { GetCommand, PutCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { GEO_INDEX, TABLE_NAME, getDocClient } from "./db";
import {
  boundingBoxPrefixes,
  encodeGeohash,
  estimatePrefixCount,
  geohashPrefix,
  isInBoundingBox,
  type BoundingBox
} from "./geo";
import type { Property } from "./types";

// Fan-out guard, sized from measurement rather than guesswork: the largest
// viewport the frontend can request (its maxBounds box at minZoom) estimates
// to ~726 prefix cells, metro-wide is ~228, a typical initial view ~112. The
// guard exists for raw API callers — a world-scale box estimates to ~33M.
export const MAX_PREFIXES = 800;

// Cap on items returned per viewport query; `truncated` tells the client to
// zoom in for the rest. Unreachable at 50 seeded listings, load-bearing at
// real data volumes.
export const MAX_RESULTS = 200;

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
  await getDocClient().send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return item;
}

export async function getPropertyById(id: string): Promise<Property | null> {
  const result = await getDocClient().send(
    new GetCommand({ TableName: TABLE_NAME, Key: { id } })
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
 * BASELINE: returns every property by scanning the whole table.
 *
 * This is intentionally the naive implementation. It dumps all rows and does no
 * geospatial work. As the data set grows this scans more and more of the table
 * on every request, and it ignores the map viewport entirely.
 *
 * Your job (Backend & Data Design): replace the viewport path with a real
 * bounding-box query that uses the `geo-index` GSI and the geohash helpers in
 * geo.ts, so the server returns only what the map can see. A stub for that is
 * below.
 */
export async function listAllProperties(): Promise<Property[]> {
  const items: Property[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await getDocClient().send(
      new ScanCommand({ TableName: TABLE_NAME, ExclusiveStartKey: lastKey })
    );
    items.push(...((result.Items as Property[] | undefined) ?? []));
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return items;
}

/**
 * Query one geo-index partition (a single geohash-prefix cell). MVP: no
 * pagination. (Hardened: now follows LastEvaluatedKey — a ~4.9 km cell in a
 * dense dataset can exceed DynamoDB's 1 MB per-Query page.)
 */
async function queryPrefix(prefix: string): Promise<Property[]> {
  const items: Property[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await getDocClient().send(
      new QueryCommand({
        TableName: TABLE_NAME,
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

export type BoundingBoxQueryResult = {
  properties: Property[];
  /** True when MAX_RESULTS clipped the response; the client should zoom in. */
  truncated: boolean;
};

/**
 * Geospatial viewport query. Turns the box into the geohash prefixes that cover
 * it, Queries those geo-index partitions in parallel, then trims the prefix-cell
 * overhang back to the exact box. Renter filters (rent/beds/type) are composed by
 * the caller (router) so this and listAllProperties share one filter step.
 *
 * MVP: no fan-out guard / result cap / per-prefix pagination yet — see the plan's
 * hardening list. (Done: fan-out guard sized from measurement — it runs on an
 * arithmetic estimate so hostile boxes are rejected before any cell strings are
 * allocated — plus per-prefix pagination, a result cap with a `truncated` flag,
 * and a timing log per query for CloudWatch/dev-api output.)
 */
export async function queryByBoundingBox(box: BoundingBox): Promise<BoundingBoxQueryResult> {
  const estimated = estimatePrefixCount(box);
  if (estimated > MAX_PREFIXES) {
    throw new ViewportTooLargeError(estimated);
  }

  const started = Date.now();
  const prefixes = boundingBoxPrefixes(box);
  const perPrefix = await Promise.all(prefixes.map(queryPrefix));
  const matches = refineToBox(dedupeById(perPrefix.flat()), box);
  const truncated = matches.length > MAX_RESULTS;
  const properties = truncated ? matches.slice(0, MAX_RESULTS) : matches;

  console.log(
    JSON.stringify({
      msg: "queryByBoundingBox",
      prefixCount: prefixes.length,
      tookMs: Date.now() - started,
      resultCount: properties.length,
      truncated
    })
  );

  return { properties, truncated };
}
