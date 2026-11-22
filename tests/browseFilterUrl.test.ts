import { describe, expect, it } from "vitest";
import { filterFromSearch, sameFilter, searchFromFilter } from "../lib/browseFilterUrl";
import type { PropertyFilter } from "../shared/contract";

describe("browse filter address bar", () => {
  const cases: PropertyFilter[] = [
    {},
    { minRent: 2000 },
    { maxRent: 4500 },
    { minRent: 3000, maxRent: 4500 },
    { bedrooms: 0 },
    { bedrooms: 2 },
    { bedrooms: 2, bedroomsExact: true },
    { minRent: 3000, maxRent: 4500, bedrooms: 2, bathrooms: 1, propertyTypes: ["condo", "house"] }
  ];

  it.each(cases)("round-trips %o through the page search string", (filter) => {
    const search = searchFromFilter(filter);
    expect(sameFilter(filterFromSearch(search), filter)).toBe(true);
    if (filter.bedrooms === 0) {
      expect(search).toContain("bedrooms=0");
      expect(search).not.toContain("bedroomsExact");
    }
  });

  it("keeps query keys the filter codec does not own", () => {
    const search = searchFromFilter({ minRent: 1800, bedrooms: 2 }, "?view=list&minRent=1");
    const params = new URLSearchParams(search);
    expect(params.get("minRent")).toBe("1800");
    expect(params.get("bedrooms")).toBe("2");
    expect(params.get("view")).toBe("list");
    expect(params.has("bbox")).toBe(false);
  });

  it("drops a non-finite rent token instead of treating it as a bound", () => {
    expect(filterFromSearch("?minRent=1000,2000&bedrooms=2")).toEqual({ bedrooms: 2 });
    expect(filterFromSearch("?maxRent=&bedrooms=0")).toEqual({ bedrooms: 0 });
  });
});
