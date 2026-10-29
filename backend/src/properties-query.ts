import { parseFilter, validateFilter, validateFilterQuery } from "./filter";
import { parseBoundingBox, type BoundingBox } from "./geo";
import type { PropertyFilter } from "./types";

type Query = Record<string, string | undefined>;

/**
 * A GET /properties query string, accepted or refused before any read.
 * `error` is a client message (the router maps it to 400); it is not an
 * HTTP status.
 */
export type PropertiesQuery =
  | { ok: true; box: BoundingBox; filter: PropertyFilter }
  | { ok: false; error: string };

const BBOX_REQUIRED = "bbox is required (bbox=minLat,minLng,maxLat,maxLng)";
const BBOX_INVALID = "Invalid bbox (expected bbox=minLat,minLng,maxLat,maxLng)";

/**
 * Parse and validate a listings query. Bbox syntax is decided here, then
 * validateFilterQuery (a non-blank number must be finite) and validateFilter's
 * domain rules (no negative bound, no inverted rent range). A non-finite token
 * must fail the request — if it were dropped, the response would be 200 and
 * every listing in the box. Bedroom matching is not decided here: bedrooms=0
 * stays a number and the studio rule lives in the filter predicate.
 */
export function parsePropertiesQuery(query: Query): PropertiesQuery {
  // Missing and blank are different errors. `bbox` absent is "required";
  // `bbox=` is present but unparsable (Number("") would otherwise be 0).
  if (query.bbox === undefined) {
    return { ok: false, error: BBOX_REQUIRED };
  }

  const box = parseBoundingBox(query);
  if (!box) {
    return { ok: false, error: BBOX_INVALID };
  }

  const syntaxError = validateFilterQuery(query);
  if (syntaxError) {
    return { ok: false, error: syntaxError };
  }

  const filter = parseFilter(query);
  const filterError = validateFilter(filter);
  if (filterError) {
    return { ok: false, error: filterError };
  }

  return { ok: true, box, filter };
}
