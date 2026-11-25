import { filterProperties } from "./filter";
import type { BoundingBox } from "./geo";
import { queryByBoundingBox, ViewportTooLargeError } from "./properties";
import type { Property, PropertyFilter } from "./types";

// Cap on items returned per query; `truncated` tells the client to zoom in
// for the rest. Applied AFTER attribute filters so a narrow filter never
// loses qualifying listings to the cap. Unreachable at 50 seeded listings,
// load-bearing at real data volumes.
export const MAX_RESULTS = 200;

export type CappedResults = {
  properties: Property[];
  /** True when MAX_RESULTS clipped the response; the client should zoom in. */
  truncated: boolean;
};

/**
 * Clip a result set to MAX_RESULTS. Pure so searchProperties can apply it
 * after attribute filters — capping before filtering would silently drop
 * qualifying listings whenever the raw viewport match count exceeded the cap.
 */
export function capResults(properties: Property[]): CappedResults {
  const truncated = properties.length > MAX_RESULTS;
  return {
    properties: truncated ? properties.slice(0, MAX_RESULTS) : properties,
    truncated
  };
}

/**
 * A viewport search. The fan-out guard is an expected refusal: the caller
 * maps `viewport-too-large` to a 400. A DynamoDB failure still throws, and
 * only the HTTP edge turns that into a 500.
 */
export type PropertySearch =
  | ({ ok: true } & CappedResults)
  | { ok: false; reason: "viewport-too-large" };

/**
 * Listings inside a viewport. Reads the geo index, applies attribute
 * filters, then caps. The fan-out guard is caught here so the router does
 * not special-case a repository exception; every other failure propagates.
 */
export async function searchProperties(
  box: BoundingBox,
  filter: PropertyFilter
): Promise<PropertySearch> {
  try {
    const inView = await queryByBoundingBox(box);
    return { ok: true, ...capResults(filterProperties(inView, filter)) };
  } catch (error) {
    if (error instanceof ViewportTooLargeError) {
      return { ok: false, reason: "viewport-too-large" };
    }
    throw error;
  }
}
