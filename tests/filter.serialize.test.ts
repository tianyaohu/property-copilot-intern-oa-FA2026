import { describe, expect, it } from "vitest";
import { parseFilter, serializeFilter } from "../backend/src/filter";
import type { PropertyFilter } from "../backend/src/types";

// serializeFilter and parseFilter are the two halves of the same field registry.
// This pins that they stay exact inverses, so a filter the user picks always
// survives the round-trip through the query string it is sent on.
describe("serializeFilter / parseFilter round-trip", () => {
  const cases: PropertyFilter[] = [
    {},
    { minRent: 1500 },
    { maxRent: 4000 },
    { minRent: 1500, maxRent: 4000 },
    { bedrooms: 2 },
    { bedrooms: 2, bedroomsExact: true },
    { bathrooms: 1 },
    { propertyTypes: ["condo"] },
    { propertyTypes: ["apartment", "townhouse"] },
    {
      minRent: 1000,
      maxRent: 3000,
      bedrooms: 1,
      bedroomsExact: true,
      bathrooms: 2,
      propertyTypes: ["house", "condo"]
    }
  ];

  it.each(cases)("reparses %o unchanged", (filter) => {
    const query = Object.fromEntries(serializeFilter(filter));
    expect(parseFilter(query)).toEqual(filter);
  });

  it("packs multiple types onto one comma-separated param", () => {
    expect(serializeFilter({ propertyTypes: ["apartment", "condo"] }).get("propertyType")).toBe(
      "apartment,condo"
    );
  });

  it("emits nothing for an empty filter", () => {
    expect(serializeFilter({}).toString()).toBe("");
  });
});
