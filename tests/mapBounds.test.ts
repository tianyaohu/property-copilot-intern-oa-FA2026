import { describe, expect, it } from "vitest";
import { isInBoundingBox, parseBoundingBox } from "../backend/src/geo";
import { serializeMapBounds } from "../lib/mapBounds";

describe("serializeMapBounds", () => {
  it("keeps an ordinary metro viewport in minLat,minLng,maxLat,maxLng order", () => {
    expect(serializeMapBounds(49.1, -123.2, 49.3, -122.8)).toBe("49.1,-123.2,49.3,-122.8");
  });

  it("clamps latitudes that stick past the poles", () => {
    expect(serializeMapBounds(-100, -123, 100, -122)).toBe("-90,-123,90,-122");
  });

  it("encodes an unwrapped date-line view as a crossing instead of truncating at 180", () => {
    // MapLibre reports this viewport as west=170, east=200 (20° past the
    // date line, i.e. longitude -160). Clamping east to 180 drops every
    // listing between -180 and -160 even though it is on screen.
    const bbox = serializeMapBounds(10, 170, 20, 200);
    expect(bbox).toBe("10,170,20,-160");

    const box = parseBoundingBox({ bbox });
    expect(box).toEqual({ minLat: 10, minLng: 170, maxLat: 20, maxLng: -160 });
    expect(isInBoundingBox(15, 175, box!)).toBe(true);
    expect(isInBoundingBox(15, -170, box!)).toBe(true);
    expect(isInBoundingBox(15, 0, box!)).toBe(false);
  });

  it("encodes a view unwrapped past -180 the same way", () => {
    // west=-190 is longitude 170. Clamping west to -180 keeps only
    // [-180, -170] and drops [170, 180].
    const bbox = serializeMapBounds(10, -190, 20, -170);
    expect(bbox).toBe("10,170,20,-170");

    const box = parseBoundingBox({ bbox });
    expect(isInBoundingBox(15, 175, box!)).toBe(true);
    expect(isInBoundingBox(15, -175, box!)).toBe(true);
    expect(isInBoundingBox(15, 0, box!)).toBe(false);
  });

  it("collapses a wider-than-the-world view to the full longitude range", () => {
    expect(serializeMapBounds(-10, -300, 10, 300)).toBe("-10,-180,10,180");
  });
});
