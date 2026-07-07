import type { Property } from "../backend/src/types";

/**
 * Minimal valid Property for tests that only care about a few fields.
 * Override what the test asserts on; everything else is plausible filler.
 */
export function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: "listing-1",
    title: "Test listing",
    description: "",
    rent: 2000,
    bedrooms: 1,
    bathrooms: 1,
    propertyType: "apartment",
    squareFeet: 500,
    street: "123 Main St",
    city: "Vancouver",
    province: "BC",
    postalCode: "V6B 1A1",
    lat: 49.28,
    lng: -123.12,
    geohash: "c2b2qeb",
    geohashPrefix: "c2b2q",
    images: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}
