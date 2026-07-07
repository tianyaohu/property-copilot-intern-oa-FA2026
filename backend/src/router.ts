import { filterProperties, parseFilter, validateFilter } from "./filter";
import { parseBoundingBox } from "./geo";
import {
  capResults,
  getPropertyById,
  queryByBoundingBox,
  ViewportTooLargeError
} from "./properties";

export type ApiRequest = {
  method: string;
  path: string;
  query: Record<string, string | undefined>;
};

export type ApiResponse = {
  statusCode: number;
  body: unknown;
};

/**
 * Framework-agnostic request router shared by the Lambda handler (production)
 * and the local dev server. Keeps the HTTP plumbing in one place so the same
 * logic runs in both environments.
 */
export async function route(req: ApiRequest): Promise<ApiResponse> {
  if (req.method !== "GET") {
    return { statusCode: 405, body: { error: "Method not allowed" } };
  }

  if (req.path === "/health") {
    return { statusCode: 200, body: { ok: true } };
  }

  // GET /properties/:id
  const detailMatch = req.path.match(/^\/properties\/([^/]+)$/);
  if (detailMatch) {
    const property = await getPropertyById(decodeURIComponent(detailMatch[1]));
    if (!property) {
      return { statusCode: 404, body: { error: "Property not found" } };
    }
    return { statusCode: 200, body: { property } };
  }

  // GET /properties
  //
  // `bbox` (minLat,minLng,maxLat,maxLng) is required — the geo-index GSI is
  // the only read path, so a request's cost is proportional to its viewport
  // and there is no scan-the-world fallback. An invalid filter (negative
  // bound, or an inverted rent range) is also rejected before any query
  // runs — otherwise it would silently produce an empty result that reads
  // as "no listings" rather than "bad request". Attribute filters compose
  // after the geospatial query (reusing the pure logic in filter.ts), and
  // the result cap runs last so filters never lose matches to it.
  if (req.path === "/properties") {
    if (req.query.bbox === undefined) {
      return {
        statusCode: 400,
        body: { error: "bbox is required (bbox=minLat,minLng,maxLat,maxLng)" }
      };
    }
    const box = parseBoundingBox(req.query);
    if (!box) {
      return {
        statusCode: 400,
        body: { error: "Invalid bbox (expected bbox=minLat,minLng,maxLat,maxLng)" }
      };
    }
    const parsedFilter = parseFilter(req.query);
    const filterError = validateFilter(parsedFilter);
    if (filterError) {
      return { statusCode: 400, body: { error: filterError } };
    }

    let inView;
    try {
      inView = await queryByBoundingBox(box);
    } catch (err) {
      // The frontend no longer caps how far a user can pan/zoom out (no
      // minZoom, no maxBounds) — zooming out toward the whole world is a
      // normal way to trigger this. This guard is now the real, user-facing
      // limiter it was always meant to be, not just a raw-API safety net.
      if (err instanceof ViewportTooLargeError) {
        return { statusCode: 400, body: { error: "Viewport too large; zoom in" } };
      }
      throw err;
    }
    const filtered = filterProperties(inView, parsedFilter);
    const { properties, truncated } = capResults(filtered);
    return {
      statusCode: 200,
      body: { properties, count: properties.length, truncated }
    };
  }

  return { statusCode: 404, body: { error: "Not found" } };
}
