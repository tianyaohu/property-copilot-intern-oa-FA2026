import { describe, expect, test } from "vitest";
import { parsePropertiesQuery } from "../backend/src/properties-query";

// Query-string parsing and filter validation, with no DynamoDB and no HTTP
// status codes. A failure is the same message the route used to inline.
const BBOX = "49,-124,50,-122";
const BOX = { minLat: 49, minLng: -124, maxLat: 50, maxLng: -122 };

describe("parsePropertiesQuery", () => {
  test("a missing bbox is rejected before filter fields are considered", () => {
    // minRent is also invalid; bbox is checked first so the client sees the
    // viewport error, matching the previous router order.
    expect(parsePropertiesQuery({ minRent: "-1" })).toEqual({
      ok: false,
      error: "bbox is required (bbox=minLat,minLng,maxLat,maxLng)"
    });
  });

  test("an empty bbox is invalid, not missing", () => {
    // `bbox=` is present, so it is not the required-param error. Number("")
    // would be 0; parseBoundingBox rejects the blank component instead.
    expect(parsePropertiesQuery({ bbox: "" })).toEqual({
      ok: false,
      error: "Invalid bbox (expected bbox=minLat,minLng,maxLat,maxLng)"
    });
  });

  test("a malformed bbox is rejected", () => {
    expect(parsePropertiesQuery({ bbox: "not,a,real,box" })).toEqual({
      ok: false,
      error: "Invalid bbox (expected bbox=minLat,minLng,maxLat,maxLng)"
    });
  });

  test("a negative rent bound surfaces validateFilter's message", () => {
    expect(parsePropertiesQuery({ bbox: BBOX, minRent: "-100" })).toEqual({
      ok: false,
      error: "minRent must be greater than or equal to 0"
    });
  });

  test("an inverted rent range surfaces validateFilter's message", () => {
    expect(parsePropertiesQuery({ bbox: BBOX, minRent: "3000", maxRent: "2000" })).toEqual({
      ok: false,
      error: "minRent must not be greater than maxRent"
    });
  });

  test("parses a viewport and attribute filter", () => {
    expect(
      parsePropertiesQuery({
        bbox: BBOX,
        minRent: "2000",
        maxRent: "3000",
        bedrooms: "2",
        bedroomsExact: "true",
        bathrooms: "1",
        propertyType: "condo,house"
      })
    ).toEqual({
      ok: true,
      box: BOX,
      filter: {
        minRent: 2000,
        maxRent: 3000,
        bedrooms: 2,
        bedroomsExact: true,
        bathrooms: 1,
        propertyTypes: ["condo", "house"]
      }
    });
  });

  test("bedrooms=0 stays a numeric filter and does not invent bedroomsExact", () => {
    // Studio exactness is the filter predicate's rule (bedrooms === 0), not
    // a parse-time rewrite. The query string is unchanged.
    expect(parsePropertiesQuery({ bbox: BBOX, bedrooms: "0" })).toEqual({
      ok: true,
      box: BOX,
      filter: { bedrooms: 0 }
    });
  });

  test("a non-finite number is rejected instead of being dropped", () => {
    // `bathrooms=lots` and a comma-joined duplicate (`1000,2000`) are not
    // finite. Omitting them would return every listing in the box.
    expect(parsePropertiesQuery({ bbox: BBOX, bathrooms: "lots" })).toEqual({
      ok: false,
      error: "bathrooms must be a finite number"
    });
    expect(parsePropertiesQuery({ bbox: BBOX, minRent: "1000,2000", bedrooms: "0" })).toEqual({
      ok: false,
      error: "minRent must be a finite number"
    });
    // Same wording once the token is literally NaN or Infinity. Syntax runs
    // before rentRangeIssue, so these stay field-level finite-number errors.
    expect(parsePropertiesQuery({ bbox: BBOX, minRent: "NaN" })).toEqual({
      ok: false,
      error: "minRent must be a finite number"
    });
    expect(parsePropertiesQuery({ bbox: BBOX, maxRent: "Infinity" })).toEqual({
      ok: false,
      error: "maxRent must be a finite number"
    });
  });
});
