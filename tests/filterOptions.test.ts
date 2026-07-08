import { describe, expect, it } from "vitest";
import {
  countActiveFilters,
  priceLabel,
  roomsLabel,
  typeLabel
} from "../components/filters/filterOptions";

// Pure label/count helpers behind the filter chips. filters.dom.test.tsx covers
// them through the rendered bar; these pin the edge cases directly (studio,
// exact-vs-minimum, overflow, price floor/ceiling).
describe("countActiveFilters", () => {
  it("counts nothing for an empty filter", () => {
    expect(countActiveFilters({})).toBe(0);
  });

  it("counts a price range as a single category", () => {
    expect(countActiveFilters({ minRent: 1000, maxRent: 3000 })).toBe(1);
    expect(countActiveFilters({ minRent: 1000 })).toBe(1);
  });

  it("ignores an empty propertyTypes array", () => {
    expect(countActiveFilters({ propertyTypes: [] })).toBe(0);
  });

  it("counts each active dimension once", () => {
    expect(
      countActiveFilters({ minRent: 1000, bedrooms: 2, bathrooms: 1, propertyTypes: ["condo"] })
    ).toBe(4);
  });
});

describe("roomsLabel", () => {
  it("falls back to a placeholder when no rooms are set", () => {
    expect(roomsLabel({})).toBe("Beds & baths");
  });

  it("shows a bedroom minimum, an exact match, and the studio special-case", () => {
    expect(roomsLabel({ bedrooms: 2 })).toBe("2+ bd");
    expect(roomsLabel({ bedrooms: 2, bedroomsExact: true })).toBe("2 bd");
    expect(roomsLabel({ bedrooms: 0 })).toBe("Studio bd");
  });

  it("combines bedrooms with a bathroom minimum", () => {
    expect(roomsLabel({ bedrooms: 2, bathrooms: 1 })).toBe("2+ bd, 1+ ba");
  });
});

describe("typeLabel", () => {
  it("falls back to a placeholder with no types", () => {
    expect(typeLabel({})).toBe("Type");
  });

  it("names a single type and overflows the rest", () => {
    expect(typeLabel({ propertyTypes: ["condo"] })).toBe("Condo");
    expect(typeLabel({ propertyTypes: ["apartment", "condo", "house"] })).toBe("Apartment +2");
  });
});

describe("priceLabel", () => {
  it("falls back to a placeholder with no price", () => {
    expect(priceLabel({})).toBe("Price");
  });

  it("renders a full range, a floor, and a ceiling", () => {
    const range = priceLabel({ minRent: 2000, maxRent: 3000 });
    expect(range).toContain("2,000");
    expect(range).toContain("3,000");

    const floor = priceLabel({ minRent: 2000 });
    expect(floor).toContain("2,000");
    expect(floor).toContain("+");

    expect(priceLabel({ maxRent: 3000 })).toContain("Up to");
  });
});
