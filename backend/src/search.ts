import { filterProperties } from "./filter";
import type { BoundingBox } from "./geo";
import { queryByBoundingBox } from "./properties";
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
 * Listings inside a viewport. Reads the geo index, applies attribute
 * filters, then caps. ViewportTooLargeError and other repository failures
 * propagate; the HTTP layer maps the fan-out guard to a 400.
 */
export async function searchProperties(
  box: BoundingBox,
  filter: PropertyFilter
): Promise<CappedResults> {
  const inView = await queryByBoundingBox(box);
  return capResults(filterProperties(inView, filter));
}
