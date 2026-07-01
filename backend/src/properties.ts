import { GetCommand, PutCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { GEO_INDEX, TABLE_NAME, getDocClient } from "./db";
import { boundingBoxPrefixes, encodeGeohash, geohashPrefix, isInBoundingBox, type BoundingBox } from "./geo";
import type { Property } from "./types";

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

/** Query one geo-index partition (a single geohash-prefix cell). MVP: no pagination. */
async function queryPrefix(prefix: string): Promise<Property[]> {
  const result = await getDocClient().send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GEO_INDEX,
      KeyConditionExpression: "geohashPrefix = :p",
      ExpressionAttributeValues: { ":p": prefix }
    })
  );
  return (result.Items as Property[] | undefined) ?? [];
}

/**
 * Geospatial viewport query. Turns the box into the geohash prefixes that cover
 * it, Queries those geo-index partitions in parallel, then trims the prefix-cell
 * overhang back to the exact box. Renter filters (rent/beds/type) are composed by
 * the caller (router) so this and listAllProperties share one filter step.
 *
 * MVP: no fan-out guard / result cap / per-prefix pagination yet — see the plan's
 * hardening list.
 */
export async function queryByBoundingBox(box: BoundingBox): Promise<Property[]> {
  const prefixes = boundingBoxPrefixes(box);
  const perPrefix = await Promise.all(prefixes.map(queryPrefix));
  return refineToBox(dedupeById(perPrefix.flat()), box);
}
