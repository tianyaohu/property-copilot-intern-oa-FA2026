import type { ApiRequest } from "./api-request";
import { clientError, ok, type ApiResponse } from "./api-response";
import { parsePropertiesQuery } from "./properties-query";
import { getPropertyById } from "./properties";
import { searchProperties } from "./search";
import { propertiesListResponse, propertyResponse } from "./types";

export type { ApiRequest, ApiResponse };

/**
 * Framework-agnostic request router shared by the Lambda handler (production)
 * and the local dev server. Maps method and path onto a status and a body.
 * Query parsing, the viewport read, and HTTP serialization live elsewhere.
 */
export async function route(req: ApiRequest): Promise<ApiResponse> {
  if (req.method !== "GET") {
    return clientError(405, "Method not allowed");
  }

  if (req.path === "/health") {
    return ok({ ok: true });
  }

  // GET /properties/:id
  const detailMatch = req.path.match(/^\/properties\/([^/]+)$/);
  if (detailMatch) {
    // One decode, matching encodeURIComponent on the client. A bare "%" is a
    // bad URL, not a missing row and not an internal failure — decode throws
    // URIError, and letting it escape becomes a 500.
    let id: string;
    try {
      id = decodeURIComponent(detailMatch[1]);
    } catch (err) {
      if (err instanceof URIError) {
        return clientError(400, "Invalid property id");
      }
      throw err;
    }
    const property = await getPropertyById(id);
    if (!property) {
      return clientError(404, "Property not found");
    }
    return ok(propertyResponse(property));
  }

  // GET /properties
  //
  // `bbox` (minLat,minLng,maxLat,maxLng) is required — the geo-index GSI is
  // the only read path, so a request's cost is proportional to its viewport
  // and there is no scan-the-world fallback. minLng > maxLng is not a swapped
  // pair: it is an antimeridian crossing (the box covers both sides of the
  // date line). An invalid filter (a non-finite number, a negative bound, or
  // an inverted rent range) is also rejected before any query runs — a
  // non-finite token such as `minRent=1000,2000` must not be dropped, or the
  // response is 200 and every listing in the box. Attribute filters compose
  // after the geospatial query (reusing the pure logic in filter.ts), and the
  // result cap runs last so filters never lose matches to it.
  if (req.path === "/properties") {
    const parsed = parsePropertiesQuery(req.query);
    if (!parsed.ok) {
      return clientError(400, parsed.error);
    }

    const found = await searchProperties(parsed.box, parsed.filter);
    // The frontend no longer caps how far a user can pan/zoom out, so a
    // world-scale box is a normal request. The fan-out guard is the limiter,
    // and it arrives as a value — a thrown error is a failed read, which the
    // HTTP edge answers as 500.
    if (!found.ok) {
      return clientError(400, "Viewport too large; zoom in");
    }
    return ok(propertiesListResponse(found.properties, found.truncated));
  }

  return clientError(404, "Not found");
}
