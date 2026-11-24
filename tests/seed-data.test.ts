import { describe, expect, test } from "vitest";
import { generateProperties } from "../backend/src/seed-data";
import { withGeoAttributes } from "../backend/src/properties";
import { encodeGeohash, geohashPrefix } from "../backend/src/geo";
import { CITIES } from "../shared/contract";

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

  test("studio descriptions use the Studio label, not a zero-bed count", () => {
    const studios = properties.filter((p) => p.bedrooms === 0);
    expect(studios.length).toBeGreaterThan(0);
    for (const p of studios) {
      expect(p.title.startsWith("Studio")).toBe(true);
      expect(p.description).toContain("Studio");
      expect(p.description).not.toContain("0 bed");
    }
    const twoBed = properties.find((p) => p.bedrooms === 2);
    expect(twoBed?.description).toMatch(/2 bed/);
  });

  test("postal codes only use letters Canada Post assigns", () => {
    // FSA letter excludes D,F,I,O,Q,U,W,Z. LDU letters exclude D,F,I,O,Q,U.
    // The seeded FSAs are fixed (V6B, V6X, V5H, V3T); the LDU letter is random.
    const code = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] \d[ABCEGHJ-NPRSTV-Z]\d$/;
    const invalid = properties.filter((p) => !code.test(p.postalCode));
    expect(invalid.map((p) => `${p.id} ${p.postalCode}`)).toEqual([]);
  });

  test("the catalogue coordinates stay put when only the postal alphabet changes", () => {
    // lat/lng are drawn before the postal letter. A letter-table change must
    // not consume an extra random number or every pin moves.
    expect(properties[0]).toMatchObject({
      id: "prop-001",
      lat: 49.279597,
      lng: -123.099552,
      street: "5660 Granville St"
    });
    expect(properties[49]).toMatchObject({
      id: "prop-050",
      lat: 49.18616,
      lng: -123.142858
    });
  });
});
