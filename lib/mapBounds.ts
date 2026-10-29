const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Wrap longitude into [-180, 180). +180 and -180 both land on -180. */
function wrapLng(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

/**
 * Serialize a map viewport to the API bbox string "minLat,minLng,maxLat,maxLng".
 *
 * MapLibre's getBounds() reports unwrapped longitudes: a view that crosses the
 * antimeridian comes back as west=170, east=200 rather than a wrapped pair.
 * Clamping each edge into ±180 keeps the request parseable but drops the side
 * past the date line, so listings on screen never match the query. When the
 * unwrapped span is shorter than a full turn and crosses ±180, encode it as
 * minLng > maxLng — parseBoundingBox treats that as the antimeridian and the
 * geo query fans out to both sides. A span of 360° or more is the whole world
 * in longitude (the fan-out guard then asks the user to zoom in).
 */
export function serializeMapBounds(south: number, west: number, north: number, east: number): string {
  const minLat = clamp(south, -90, 90);
  const maxLat = clamp(north, -90, 90);

  const span = east - west;
  let minLng: number;
  let maxLng: number;
  if (span >= 360) {
    minLng = -180;
    maxLng = 180;
  } else if (west >= -180 && east <= 180 && west <= east) {
    // Already inside ±180. Re-wrapping is not exact for values like -123.2
    // (((lng + 180) % 360) drifts), and would change an ordinary viewport's
    // query string on every pan.
    minLng = west;
    maxLng = east;
  } else if (Number.isFinite(span)) {
    const wrappedWest = wrapLng(west);
    const wrappedEast = wrappedWest + span;
    if (wrappedEast > 180) {
      minLng = wrappedWest;
      maxLng = wrappedEast - 360;
    } else {
      minLng = wrappedWest;
      maxLng = wrappedEast;
    }
    // Float dust just outside ±180 would fail the server's range check.
    minLng = clamp(minLng, -180, 180);
    maxLng = clamp(maxLng, -180, 180);
  } else {
    minLng = west;
    maxLng = east;
  }

  return `${minLat},${minLng},${maxLat},${maxLng}`;
}
