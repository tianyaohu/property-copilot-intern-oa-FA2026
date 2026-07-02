import { describe, expect, test } from "vitest";
import { filterProperties, parseFilter } from "../backend/src/filter";
import { SEED_PROPERTIES } from "../backend/src/seed-data";
import type { Property } from "../backend/src/types";

// Seed data lacks geo attributes; tests here do not need them.
const PROPERTIES = SEED_PROPERTIES as Property[];

describe("filterProperties", () => {
  test("rent range is inclusive on both ends", () => {
    const result = filterProperties(PROPERTIES, { minRent: 2000, maxRent: 3000 });
    expect(result.length).toBeGreaterThan(0);
    for (const p of result) {
      expect(p.rent).toBeGreaterThanOrEqual(2000);
      expect(p.rent).toBeLessThanOrEqual(3000);
    }
  });

  test("bedrooms filter is a minimum", () => {
    const result = filterProperties(PROPERTIES, { bedrooms: 3 });
    expect(result.every((p) => p.bedrooms >= 3)).toBe(true);
  });

  test("property type matches exactly", () => {
    const result = filterProperties(PROPERTIES, { propertyType: "condo" });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((p) => p.propertyType === "condo")).toBe(true);
  });

  test("filters compose: combining rent and bedrooms narrows the result", () => {
    const rentOnly = filterProperties(PROPERTIES, { maxRent: 3000 });
    const both = filterProperties(PROPERTIES, { maxRent: 3000, bedrooms: 2 });
    expect(both.length).toBeLessThanOrEqual(rentOnly.length);
    expect(both.every((p) => p.rent <= 3000 && p.bedrooms >= 2)).toBe(true);
  });

  test("bathrooms filter is a minimum", () => {
    const result = filterProperties(PROPERTIES, { bathrooms: 2 });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((p) => p.bathrooms >= 2)).toBe(true);
  });

  test("bathrooms composes with rent and bedrooms", () => {
    const two = filterProperties(PROPERTIES, { maxRent: 3500, bedrooms: 2 });
    const three = filterProperties(PROPERTIES, { maxRent: 3500, bedrooms: 2, bathrooms: 2 });
    expect(three.length).toBeLessThanOrEqual(two.length);
    expect(three.every((p) => p.rent <= 3500 && p.bedrooms >= 2 && p.bathrooms >= 2)).toBe(true);
  });

  test("no filters returns everything", () => {
    expect(filterProperties(PROPERTIES, {})).toHaveLength(PROPERTIES.length);
  });
});

describe("parseFilter", () => {
  test("parses valid query params", () => {
    expect(
      parseFilter({
        minRent: "1500",
        maxRent: "3000",
        bedrooms: "2",
        bathrooms: "2",
        propertyType: "house"
      })
    ).toEqual({ minRent: 1500, maxRent: 3000, bedrooms: 2, bathrooms: 2, propertyType: "house" });
  });

  test("ignores invalid property type and absent fields", () => {
    expect(parseFilter({ propertyType: "castle" })).toEqual({});
    expect(parseFilter({})).toEqual({});
  });

  test("ignores non-numeric bathrooms", () => {
    expect(parseFilter({ bathrooms: "lots" })).toEqual({});
  });
});
