import { describe, expect, test } from "vitest";
import { generateProperties } from "../backend/src/seed-data";
import { withGeoAttributes } from "../backend/src/properties";
import { encodeGeohash, geohashPrefix } from "../backend/src/geo";

const CITIES = ["Vancouver", "Richmond", "Burnaby", "Surrey"];

describe("seed data", () => {
  const properties = generateProperties();

  test("produces 50 listings with unique ids", () => {
    expect(properties).toHaveLength(50);
    expect(new Set(properties.map((p) => p.id)).size).toBe(50);
  });

  test("is deterministic", () => {
    expect(generateProperties()).toEqual(properties);
  });

  test("the listings collectively span all four target cities", () => {
    const cities = new Set(properties.map((p) => p.city));
    expect([...cities].sort()).toEqual([...CITIES].sort());
  });

  test("every listing has exactly five images and sane metadata", () => {
    for (const p of properties) {
      expect(p.images).toHaveLength(5);
      expect(p.province).toBe("BC");
      expect(p.rent).toBeGreaterThan(0);
      expect(p.bedrooms).toBeGreaterThanOrEqual(0);
      expect(p.bathrooms).toBeGreaterThanOrEqual(1);
      expect(Math.abs(p.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(p.lng)).toBeLessThanOrEqual(180);
    }
  });

  test("geo attributes are derived from coordinates", () => {
    const withGeo = withGeoAttributes(properties[0]);
    expect(withGeo.geohash).toBe(encodeGeohash(properties[0].lat, properties[0].lng));
    expect(withGeo.geohashPrefix).toBe(geohashPrefix(withGeo.geohash));
  });
});
