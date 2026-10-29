import { parsePropertiesQuery } from "./properties-query";
import { getPropertyById, ViewportTooLargeError } from "./properties";
import { searchProperties } from "./search";
import { propertiesListResponse, propertyResponse } from "./types";

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
 * and the local dev server. Maps method and path onto a status and a body.
 * Query parsing, the viewport read, and HTTP serialization live elsewhere.
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
    return { statusCode: 200, body: propertyResponse(property) };
  }

  // GET /properties
  //
  // `bbox` (minLat,minLng,maxLat,maxLng) is required — the geo-index GSI is
  // the only read path, so a request's cost is proportional to its viewport
  // and there is no scan-the-world fallback. minLng > maxLng is not a swapped
  // pair: it is an antimeridian crossing (the box covers both sides of the
  // date line). An invalid filter (negative bound, or an inverted rent range)
  // is also rejected before any query runs — otherwise it would silently
  // produce an empty result that reads as "no listings" rather than "bad
  // request". Attribute filters compose after the geospatial query (reusing
  // the pure logic in filter.ts), and the result cap runs last so filters
  // never lose matches to it.
  if (req.path === "/properties") {
    const parsed = parsePropertiesQuery(req.query);
    if (!parsed.ok) {
      return { statusCode: 400, body: { error: parsed.error } };
    }

    try {
      const { properties, truncated } = await searchProperties(parsed.box, parsed.filter);
      return {
        statusCode: 200,
        body: propertiesListResponse(properties, truncated)
      };
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
  }

  return { statusCode: 404, body: { error: "Not found" } };
}
