import { describe, expect, test } from "vitest";
import { filterProperties, parseFilter, validateFilter } from "../backend/src/filter";
import { SEED_PROPERTIES } from "../backend/src/seed-data";
import type { Property } from "../backend/src/types";
import { makeProperty } from "./fixtures";

// Seed data lacks geo attributes; tests here do not need them.
const PROPERTIES = SEED_PROPERTIES as Property[];

describe("filterProperties", () => {
  // Boundary and minimum semantics are pinned with explicit fixtures rather
  // than seed data: asserting exact surviving ids distinguishes inclusive
  // bounds from exclusive and "at least N" from "exactly N" — properties a
  // seed-based every() check cannot detect (mutation-verified).
  test("rent range is inclusive on both ends", () => {
    const items = [
      makeProperty({ id: "below", rent: 1999 }),
      makeProperty({ id: "at-min", rent: 2000 }),
      makeProperty({ id: "inside", rent: 2500 }),
      makeProperty({ id: "at-max", rent: 3000 }),
      makeProperty({ id: "above", rent: 3001 })
    ];

    const result = filterProperties(items, { minRent: 2000, maxRent: 3000 });

    expect(result.map((p) => p.id)).toEqual(["at-min", "inside", "at-max"]);
  });

  test("bedrooms filter is a minimum, not an exact match", () => {
    const items = [
      makeProperty({ id: "one-bed", bedrooms: 1 }),
      makeProperty({ id: "two-bed", bedrooms: 2 }),
      makeProperty({ id: "three-bed", bedrooms: 3 })
    ];

    const result = filterProperties(items, { bedrooms: 2 });

    expect(result.map((p) => p.id)).toEqual(["two-bed", "three-bed"]);
  });

  test("bedroomsExact restricts to an exact bedroom count, not a minimum", () => {
    const items = [
      makeProperty({ id: "one-bed", bedrooms: 1 }),
      makeProperty({ id: "two-bed", bedrooms: 2 }),
      makeProperty({ id: "three-bed", bedrooms: 3 })
    ];

    const result = filterProperties(items, { bedrooms: 2, bedroomsExact: true });

    expect(result.map((p) => p.id)).toEqual(["two-bed"]);
  });

  test("bedroomsExact: false (or absent) keeps the minimum semantics", () => {
    const items = [
      makeProperty({ id: "one-bed", bedrooms: 1 }),
      makeProperty({ id: "two-bed", bedrooms: 2 }),
      makeProperty({ id: "three-bed", bedrooms: 3 })
    ];

    const result = filterProperties(items, { bedrooms: 2, bedroomsExact: false });

    expect(result.map((p) => p.id)).toEqual(["two-bed", "three-bed"]);
  });

  test("bathrooms filter is a minimum, not an exact match", () => {
    const items = [
      makeProperty({ id: "one-bath", bathrooms: 1 }),
      makeProperty({ id: "two-bath", bathrooms: 2 }),
      makeProperty({ id: "three-bath", bathrooms: 3 })
    ];

    const result = filterProperties(items, { bathrooms: 2 });

    expect(result.map((p) => p.id)).toEqual(["two-bath", "three-bath"]);
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

  test("parses bedroomsExact only from the literal string 'true'", () => {
    expect(parseFilter({ bedrooms: "2", bedroomsExact: "true" })).toEqual({
      bedrooms: 2,
      bedroomsExact: true
    });
    expect(parseFilter({ bedrooms: "2", bedroomsExact: "yes" })).toEqual({ bedrooms: 2 });
    expect(parseFilter({ bedroomsExact: "true" })).toEqual({ bedroomsExact: true });
  });

  test("ignores empty and whitespace-only values instead of coercing them to 0", () => {
    // Number("") === 0, so without an explicit guard a URL like ?maxRent=
    // would parse as {maxRent: 0} and silently filter out every listing.
    expect(parseFilter({ maxRent: "" })).toEqual({});
    expect(parseFilter({ minRent: " " })).toEqual({});
    expect(parseFilter({ bedrooms: "", bathrooms: "" })).toEqual({});
  });
});

describe("validateFilter", () => {
  test("rejects a negative minRent", () => {
    expect(validateFilter({ minRent: -1 })).not.toBeNull();
  });

  test("rejects a negative maxRent", () => {
    expect(validateFilter({ maxRent: -1 })).not.toBeNull();
  });

  test("rejects a negative bedrooms minimum", () => {
    expect(validateFilter({ bedrooms: -1 })).not.toBeNull();
  });

  test("rejects a negative bathrooms minimum", () => {
    expect(validateFilter({ bathrooms: -1 })).not.toBeNull();
  });

  test("rejects minRent greater than maxRent", () => {
    expect(validateFilter({ minRent: 3000, maxRent: 2000 })).not.toBeNull();
  });

  test("allows minRent equal to maxRent", () => {
    // An exact-price filter is legitimate; only a strictly inverted range
    // (min > max) is invalid, matching filterProperties's inclusive-both-ends
    // rent range semantics.
    expect(validateFilter({ minRent: 2000, maxRent: 2000 })).toBeNull();
  });

  test("allows a fully valid filter", () => {
    expect(
      validateFilter({ minRent: 1500, maxRent: 3000, bedrooms: 2, bathrooms: 1, propertyType: "house" })
    ).toBeNull();
  });

  test("allows an empty filter", () => {
    expect(validateFilter({})).toBeNull();
  });
});
