import { describe, expect, test, it } from "vitest";
import {
  GEOHASH_PREFIX_LENGTH,
  boundingBoxPrefixes,
  encodeGeohash,
  estimatePrefixCount,
  geohashPrefix,
  isInBoundingBox,
  parseBoundingBox,
  type BoundingBox
} from "../backend/src/geo";
import {
  MAX_PREFIXES,
  ViewportTooLargeError,
  dedupeById,
  queryByBoundingBox,
  refineToBox
} from "../backend/src/properties";
import type { Property } from "../backend/src/types";
import { makeProperty } from "./fixtures";

// A box covering roughly downtown Vancouver.
const VANCOUVER_BOX: BoundingBox = {
  minLat: 49.26,
  minLng: -123.14,
  maxLat: 49.3,
  maxLng: -123.1
};

describe("geo", () => {
  test("encodeGeohash is deterministic and prefix is the right length", () => {
    const hash = encodeGeohash(49.2827, -123.1207);
    expect(hash).toBe(encodeGeohash(49.2827, -123.1207));
    expect(geohashPrefix(hash)).toHaveLength(GEOHASH_PREFIX_LENGTH);
    expect(hash.startsWith(geohashPrefix(hash))).toBe(true);
  });

  test("nearby points share a geohash prefix; far points do not", () => {
    const vancouver = geohashPrefix(encodeGeohash(49.2827, -123.1207));
    const nearby = geohashPrefix(encodeGeohash(49.2835, -123.1215));
    const surrey = geohashPrefix(encodeGeohash(49.1913, -122.849));
    expect(nearby).toBe(vancouver);
    expect(surrey).not.toBe(vancouver);
  });

  test("boundingBoxPrefixes covers the box and is de-duplicated", () => {
    const prefixes = boundingBoxPrefixes(VANCOUVER_BOX);
    expect(prefixes.length).toBeGreaterThan(0);
    expect(new Set(prefixes).size).toBe(prefixes.length);
    // A point inside the box must fall in one of the returned prefixes.
    const inside = geohashPrefix(encodeGeohash(49.28, -123.12));
    expect(prefixes).toContain(inside);
  });

  test("isInBoundingBox respects edges", () => {
    expect(isInBoundingBox(49.28, -123.12, VANCOUVER_BOX)).toBe(true);
    expect(isInBoundingBox(49.19, -122.85, VANCOUVER_BOX)).toBe(false);
  });
});

describe('parseBoundingBox', () => {
  it('parses valid bbox', () => {
    expect(parseBoundingBox({ bbox: '0,0,1,1' })).toEqual({
      minLat: 0, minLng: 0, maxLat: 1, maxLng: 1,
    });
  });

  it('returns null when bbox is missing', () => {
    expect(parseBoundingBox({})).toBeNull();
  });

  it('returns null when values are not numbers', () => {
  expect(parseBoundingBox({ bbox: 'a,b,c,d' })).toBeNull();
  });

  it('returns null when arity is wrong', () => {
    expect(parseBoundingBox({ bbox: '1,2,3' })).toBeNull();
  });

  it('returns null when values are out of range', () => {
    expect(parseBoundingBox({ bbox: '-91,0,0,10' })).toBeNull();
  });

  it('returns null when bounds are inverted', () => {
    expect(parseBoundingBox({ bbox: '10,0,0,10' })).toBeNull();
  });

  it("parses an antimeridian crossing (minLng > maxLng) instead of rejecting it", () => {
    // Standard bbox convention: longitude may wrap. minLng > maxLng means the
    // box crosses the date line, not that the caller swapped the edges.
    expect(parseBoundingBox({ bbox: "10,170,20,-160" })).toEqual({
      minLat: 10,
      minLng: 170,
      maxLat: 20,
      maxLng: -160
    });
  });

  it("still rejects a crossing whose longitude is outside ±180", () => {
    // 200 is not a wrapped edge; only values inside ±180 may form a crossing.
    expect(parseBoundingBox({ bbox: "10,200,20,-170" })).toBeNull();
  });

  it('returns null when a component is empty instead of coercing it to 0', () => {
    // Number("") === 0 is finite, so without an explicit guard "0,,1,1"
    // would silently parse as minLng: 0.
    expect(parseBoundingBox({ bbox: '0,,1,1' })).toBeNull();
    expect(parseBoundingBox({ bbox: ',,,' })).toBeNull();
    expect(parseBoundingBox({ bbox: '0, ,1,1' })).toBeNull();
  });
});

describe("property helpers", () => {
  test("refineToBox keeps only points inside the exact box", () => {
    const items: Property[] = [
      makeProperty({ id: "inside", lat: 49.28, lng: -123.12 }),
      makeProperty({ id: "outside", lat: 49.19, lng: -122.85 })
    ];

    expect(refineToBox(items, VANCOUVER_BOX).map((item) => item.id)).toEqual(["inside"]);
  });

  test("dedupeById collapses duplicate ids", () => {
    const items: Property[] = [
      makeProperty({ lat: 49.28, lng: -123.12 }),
      makeProperty({ title: "Replacement listing", lat: 49.29, lng: -123.11 })
    ];

    const deduped = dedupeById(items);

    expect(deduped).toHaveLength(1);
    expect(deduped[0]).toMatchObject({ title: "Replacement listing", lat: 49.29, lng: -123.11 });
  });
});

describe("fan-out guard", () => {
  // A realistic "zoomed all the way out over all of Metro Vancouver"
  // viewport. Not a UI-imposed ceiling anymore (the map has no maxBounds/
  // minZoom) — kept as a regression fixture proving typical real-world usage
  // stays comfortably under MAX_PREFIXES.
  const WIDE_METRO_BOX: BoundingBox = { minLat: 48.8, minLng: -123.6, maxLat: 49.7, maxLng: -122.2 };
  // The frontend no longer caps zoom-out, so a box this large is now directly
  // reachable by zooming the UI all the way out, not just a theoretical
  // raw-API case.
  const WORLD_BOX: BoundingBox = { minLat: -89, minLng: -179, maxLat: 89, maxLng: 179 };

  test("estimatePrefixCount upper-bounds the real cell count", () => {
    // The date-line box is only a degree or so wide, but it wraps: 179.5°E
    // across to 179.5°W. The guard has to count both sides.
    const DATE_LINE_BOX: BoundingBox = {
      minLat: 15,
      minLng: 179.5,
      maxLat: 15.2,
      maxLng: -179.5
    };
    for (const box of [VANCOUVER_BOX, WIDE_METRO_BOX, DATE_LINE_BOX]) {
      expect(estimatePrefixCount(box)).toBeGreaterThanOrEqual(boundingBoxPrefixes(box).length);
      expect(estimatePrefixCount(box)).toBeGreaterThan(0);
    }
  });

  test("a date-line viewport covers cells on both sides and not the gap", () => {
    const box: BoundingBox = { minLat: 15, minLng: 179.5, maxLat: 15.2, maxLng: -179.5 };
    const prefixes = boundingBoxPrefixes(box);
    expect(prefixes).toContain(geohashPrefix(encodeGeohash(15.1, 179.8)));
    expect(prefixes).toContain(geohashPrefix(encodeGeohash(15.1, -179.8)));
    expect(prefixes).not.toContain(geohashPrefix(encodeGeohash(15.1, 0)));
    expect(isInBoundingBox(15.1, 179.8, box)).toBe(true);
    expect(isInBoundingBox(15.1, -179.8, box)).toBe(true);
    expect(isInBoundingBox(15.1, 0, box)).toBe(false);
    expect(estimatePrefixCount(box)).toBeLessThanOrEqual(MAX_PREFIXES);
  });

  test("a near-global antimeridian span is rejected before cell enumeration", async () => {
    // East from 10° all the way around to -10° is ~340° of longitude.
    // Counting it as a negative width (max < min) would skip the fan-out
    // guard and either return nothing or allocate the world.
    const box: BoundingBox = { minLat: -70, minLng: 10, maxLat: 70, maxLng: -10 };
    expect(estimatePrefixCount(box)).toBeGreaterThan(MAX_PREFIXES);
    await expect(queryByBoundingBox(box)).rejects.toThrow(ViewportTooLargeError);
  });

  test("a realistic wide metro viewport stays comfortably under the guard", () => {
    expect(estimatePrefixCount(WIDE_METRO_BOX)).toBeLessThanOrEqual(MAX_PREFIXES);
  });

  test("a world-scale box is rejected before any DynamoDB work", async () => {
    // Passes with or without a live DynamoDB (CI exports DYNAMODB_ENDPOINT;
    // plain local runs don't): the guard throws on the arithmetic estimate
    // before the first Query would be sent, so no database is ever contacted.
    await expect(queryByBoundingBox(WORLD_BOX)).rejects.toThrow(ViewportTooLargeError);
  });
});
