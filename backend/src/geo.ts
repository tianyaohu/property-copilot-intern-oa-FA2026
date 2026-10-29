import ngeohash from "ngeohash";

/**
 * Geohash precision used for the stored `geohash` attribute. Precision 7 gives
 * roughly 150m x 150m cells, plenty fine for street-level placement.
 */
export const GEOHASH_PRECISION = 7;

/**
 * Length of the `geohashPrefix` partition key on the geo GSI. Precision 5 gives
 * roughly 5km x 5km cells, a reasonable partition size for a metro-area data
 * set: a city-level viewport touches only a handful of prefixes.
 */
export const GEOHASH_PREFIX_LENGTH = 5;

export type BoundingBox = {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
};

/** Encode a coordinate to the full-precision geohash stored on an item. */
export function encodeGeohash(lat: number, lng: number): string {
  return ngeohash.encode(lat, lng, GEOHASH_PRECISION);
}

/** The GSI partition key derived from a full geohash. */
export function geohashPrefix(geohash: string): string {
  return geohash.slice(0, GEOHASH_PREFIX_LENGTH);
}

/**
 * Longitude ranges to enumerate. A normal box is one range. An antimeridian
 * crossing (minLng > maxLng) is the union of [minLng, 180] and [-180, maxLng] —
 * ngeohash.bboxes returns nothing when min longitude is greater than max.
 */
function longitudeSegments(minLng: number, maxLng: number): Array<[number, number]> {
  if (minLng <= maxLng) return [[minLng, maxLng]];
  return [
    [minLng, 180],
    [-180, maxLng]
  ];
}

/**
 * The set of `geohashPrefix` partitions that cover a bounding box. A
 * bounding-box query should Query the geo GSI once per returned prefix, then
 * discard any items whose lat/lng falls outside the exact box.
 *
 * This is the geospatial primitive your viewport query is built on: turn the
 * map's visible bounds into prefixes, query those partitions, refine. A box
 * that crosses the antimeridian is enumerated as two ranges so cells on both
 * sides of the date line are included and the interior gap is not.
 */
export function boundingBoxPrefixes(box: BoundingBox): string[] {
  const cells = longitudeSegments(box.minLng, box.maxLng).flatMap(([minLng, maxLng]) =>
    ngeohash.bboxes(box.minLat, minLng, box.maxLat, maxLng, GEOHASH_PREFIX_LENGTH)
  );
  return Array.from(new Set(cells));
}

// Prefix-cell dimensions at GEOHASH_PREFIX_LENGTH (precision 5): a geohash of
// odd length splits its bits 12 latitude / 13 longitude, so each cell spans
// 180/2^12 by 360/2^13 degrees (~4.9 km × 4.9 km at this latitude).
const PREFIX_CELL_LAT_DEG = 180 / 2 ** 12;
const PREFIX_CELL_LNG_DEG = 360 / 2 ** 13;

/**
 * Cheap upper-bound estimate of how many prefix cells cover a box. Computed
 * arithmetically so an oversized box can be rejected BEFORE
 * `ngeohash.bboxes` runs — a world-scale box at precision 5 is ~33 million
 * cells, which would be allocated as strings before an after-the-fact guard
 * ever saw a count.
 */
function segmentPrefixCount(minLat: number, minLng: number, maxLat: number, maxLng: number): number {
  const rows = Math.floor((maxLat - minLat) / PREFIX_CELL_LAT_DEG) + 2;
  const cols = Math.floor((maxLng - minLng) / PREFIX_CELL_LNG_DEG) + 2;
  return rows * cols;
}

export function estimatePrefixCount(box: BoundingBox): number {
  // A crossing has minLng > maxLng, so a single (max - min) width is negative
  // and would slip under the fan-out guard. Count each side of the date line.
  return longitudeSegments(box.minLng, box.maxLng).reduce(
    (total, [minLng, maxLng]) => total + segmentPrefixCount(box.minLat, minLng, box.maxLat, maxLng),
    0
  );
}

/** Whether a coordinate lies inside a bounding box (inclusive edges). */
export function isInBoundingBox(lat: number, lng: number, box: BoundingBox): boolean {
  if (lat < box.minLat || lat > box.maxLat) return false;
  // minLng > maxLng is the antimeridian: inside if on either side of the date line.
  if (box.minLng > box.maxLng) {
    return lng >= box.minLng || lng <= box.maxLng;
  }
  return lng >= box.minLng && lng <= box.maxLng;
}

export function parseBoundingBox(query: Record<string, string | undefined>): BoundingBox | null {
  const raw = query.bbox;
  if (!raw) return null;

  const parts = raw.split(",");
  if (parts.length !== 4) return null;
  // Number("") is 0, so a blank component like "0,,1,1" would silently parse
  // as coordinate 0 without this guard.
  if (parts.some((part) => part.trim() === "")) return null;

  const minLat = Number(parts[0]);
  const minLng = Number(parts[1]);
  const maxLat = Number(parts[2]);
  const maxLng = Number(parts[3]);

  if (![minLat, minLng, maxLat, maxLng].every(Number.isFinite)) return null;
  // Each edge is checked on its own. The old minLng < -180 || maxLng > 180
  // test only works when minLng <= maxLng; a crossing can put an out-of-range
  // value on the min side (minLng=200, maxLng=-170) and slip through it.
  if (minLat < -90 || minLat > 90 || maxLat < -90 || maxLat > 90) return null;
  if (minLng < -180 || minLng > 180 || maxLng < -180 || maxLng > 180) return null;
  // Latitude does not wrap. Longitude does: minLng > maxLng is the
  // antimeridian (the box covers [minLng, 180] ∪ [-180, maxLng]), not a swap.
  if (minLat > maxLat) return null;

  return { minLat, minLng, maxLat, maxLng };
}