import { beforeEach, describe, expect, it, vi } from "vitest";
import { PROPERTY_TYPES as UI_PROPERTY_TYPES } from "../components/filters/filterOptions";
import { parseFilter, validateFilter } from "../backend/src/filter";
import * as backendTypes from "../backend/src/types";
import { SEED_PROPERTIES } from "../backend/src/seed-data";
import { loadProperties } from "../lib/propertiesQuery";
import { validatePriceRange } from "../lib/priceValidation";
import * as libTypes from "../lib/types";
import {
  CITIES,
  PROPERTY_TYPES,
  isPropertyType,
  propertiesListResponse,
  propertyResponse,
  rentRangeIssue
} from "../shared/contract";
import { route } from "../backend/src/router";
import { getPropertyById, queryByBoundingBox } from "../backend/src/properties";
import { makeProperty } from "./fixtures";

// The list and detail routes must return the shared response builders, not a
// hand-written object that can grow a field the client never hears about.
// DynamoDB stays mocked; parsing, validation, and the response shape run for real.
vi.mock("../backend/src/properties", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../backend/src/properties")>();
  return {
    ...actual,
    getPropertyById: vi.fn(),
    queryByBoundingBox: vi.fn()
  };
});

const apiRentMessage = {
  "non-finite-min": "minRent must be a finite number",
  "non-finite-max": "maxRent must be a finite number",
  "negative-min": "minRent must be greater than or equal to 0",
  "negative-max": "maxRent must be greater than or equal to 0",
  inverted: "minRent must not be greater than maxRent"
} as const;

const uiRentMessage = {
  "non-finite-min": "Minimum rent must be a finite number.",
  "non-finite-max": "Maximum rent must be a finite number.",
  "negative-min": "Minimum rent can't be negative.",
  "negative-max": "Maximum rent can't be negative.",
  inverted: "Minimum rent can't be more than maximum rent."
} as const;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("shared property contract", () => {
  it("is the same enum object the API module and the client module re-export", () => {
    // Identity, not deep equality: a copied array would still match `.toEqual`
    // and could drift on the next edit.
    expect(backendTypes.PROPERTY_TYPES).toBe(PROPERTY_TYPES);
    expect(libTypes.PROPERTY_TYPES).toBe(PROPERTY_TYPES);
    expect(backendTypes.CITIES).toBe(CITIES);
    expect(libTypes.CITIES).toBe(CITIES);
  });

  it("builds property-type filter options from the wire enum, in that order", () => {
    expect(UI_PROPERTY_TYPES.map((option) => option.value)).toEqual([...PROPERTY_TYPES]);
    expect(UI_PROPERTY_TYPES.map((option) => option.label)).toEqual([
      "Apartment",
      "Condo",
      "House",
      "Townhouse"
    ]);
  });

  it("parseFilter accepts every wire property type and drops anything else", () => {
    for (const type of PROPERTY_TYPES) {
      expect(isPropertyType(type)).toBe(true);
      expect(parseFilter({ propertyType: type })).toEqual({ propertyTypes: [type] });
    }
    expect(isPropertyType("castle")).toBe(false);
    expect(parseFilter({ propertyType: "castle" })).toEqual({});
  });

  it("seed listings use only contract cities and property types, and cover each of them", () => {
    for (const property of SEED_PROPERTIES) {
      expect(CITIES).toContain(property.city);
      expect(PROPERTY_TYPES).toContain(property.propertyType);
    }
    expect(new Set(SEED_PROPERTIES.map((property) => property.city))).toEqual(new Set(CITIES));
    expect(new Set(SEED_PROPERTIES.map((property) => property.propertyType))).toEqual(
      new Set(PROPERTY_TYPES)
    );
  });

  it("the API and the price filter reject exactly the ranges rentRangeIssue rejects", () => {
    const samples = [undefined, -1, 0, 1, 2000, 3000] as const;
    for (const minRent of samples) {
      for (const maxRent of samples) {
        const issue = rentRangeIssue(minRent, maxRent);
        expect(validateFilter({ minRent, maxRent })).toBe(issue ? apiRentMessage[issue] : null);
        expect(validatePriceRange(minRent, maxRent)).toBe(issue ? uiRentMessage[issue] : null);
      }
    }
  });

  it("GET /properties returns the shared list body", async () => {
    const listed = makeProperty({ id: "in-view" });
    vi.mocked(queryByBoundingBox).mockResolvedValue([listed]);

    const res = await route({
      method: "GET",
      path: "/properties",
      query: { bbox: "49,-124,50,-122" }
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(propertiesListResponse([listed], false));
  });

  it("GET /properties/:id returns the shared detail body", async () => {
    const property = makeProperty({ id: "detail-1" });
    vi.mocked(getPropertyById).mockResolvedValue(property);

    const res = await route({
      method: "GET",
      path: "/properties/detail-1",
      query: {}
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(propertyResponse(property));
  });

  it("loadProperties sends the shared query and reads the shared list body", async () => {
    const property = makeProperty();
    const body = propertiesListResponse([property], true);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );

    try {
      const result = await loadProperties({
        filter: { minRent: 1500, propertyTypes: ["condo"] },
        bbox: "49,-123.2,49.3,-122.8"
      });
      expect(result).toEqual({ status: "success", properties: [property], truncated: true });

      const url = new URL(String(fetchMock.mock.calls[0][0]));
      expect(url.pathname).toBe("/properties");
      expect(url.searchParams.get("bbox")).toBe("49,-123.2,49.3,-122.8");
      expect(url.searchParams.get("minRent")).toBe("1500");
      expect(url.searchParams.get("propertyType")).toBe("condo");
    } finally {
      fetchMock.mockRestore();
    }
  });
});
