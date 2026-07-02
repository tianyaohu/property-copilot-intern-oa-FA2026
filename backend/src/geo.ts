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
 * The set of `geohashPrefix` partitions that cover a bounding box. A
 * bounding-box query should Query the geo GSI once per returned prefix, then
 * discard any items whose lat/lng falls outside the exact box.
 *
 * This is the geospatial primitive your viewport query is built on: turn the
 * map's visible bounds into prefixes, query those partitions, refine.
 */
export function boundingBoxPrefixes(box: BoundingBox): string[] {
  const cells = ngeohash.bboxes(
    box.minLat,
    box.minLng,
    box.maxLat,
    box.maxLng,
    GEOHASH_PREFIX_LENGTH
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
export function estimatePrefixCount(box: BoundingBox): number {
  const rows = Math.floor((box.maxLat - box.minLat) / PREFIX_CELL_LAT_DEG) + 2;
  const cols = Math.floor((box.maxLng - box.minLng) / PREFIX_CELL_LNG_DEG) + 2;
  return rows * cols;
}

/** Whether a coordinate lies inside a bounding box (inclusive edges). */
export function isInBoundingBox(lat: number, lng: number, box: BoundingBox): boolean {
  return lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng;
}

export function parseBoundingBox(query: Record<string, string | undefined>): BoundingBox | null {
  const raw = query.bbox;
  if (!raw) return null;

  const parts = raw.split(",");
  if (parts.length !== 4) return null;

  const minLat = Number(parts[0]);
  const minLng = Number(parts[1]);
  const maxLat = Number(parts[2]);
  const maxLng = Number(parts[3]);

  if (![minLat, minLng, maxLat, maxLng].every(Number.isFinite)) return null;
  if (minLat < -90 || maxLat > 90 || minLng < -180 || maxLng > 180) return null;
  if (minLat > maxLat || minLng > maxLng) return null;

  return { minLat, minLng, maxLat, maxLng };
}