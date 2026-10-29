import { describe, expect, it } from "vitest";
import { queryRecordFromSearchParams } from "../backend/src/query-string";

// Local dev has to hand the router the same query map API Gateway HTTP API
// payload 2.0 does. Last-wins (URLSearchParams.forEach) disagrees with that
// format, which joins repeated keys with a comma.
describe("queryRecordFromSearchParams", () => {
  it("joins repeated keys with a comma", () => {
    const params = new URLSearchParams();
    params.append("propertyType", "apartment");
    params.append("propertyType", "condo");
    params.append("minRent", "1000");
    params.append("minRent", "2000");
    params.append("bedrooms", "0");

    expect(queryRecordFromSearchParams(params)).toEqual({
      propertyType: "apartment,condo",
      minRent: "1000,2000",
      bedrooms: "0"
    });
  });

  it("preserves a single comma-separated value and bedrooms=0", () => {
    const params = new URLSearchParams(
      "bbox=49.2%2C-123.2%2C49.4%2C-123.0&propertyType=apartment%2Ccondo&bedrooms=0"
    );

    expect(queryRecordFromSearchParams(params)).toEqual({
      bbox: "49.2,-123.2,49.4,-123.0",
      propertyType: "apartment,condo",
      bedrooms: "0"
    });
  });
});
