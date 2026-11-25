import { describe, expect, it } from "vitest";
import { metadata } from "@/app/browse/layout";

describe("browse metadata", () => {
  it("gives /browse its own title and description", () => {
    expect(metadata.title).toBe("Browse rentals in Metro Vancouver");
    expect(metadata.description).toBe(
      "Browse rental listings across Vancouver, Richmond, Burnaby, and Surrey on a map. Filter by price, bedrooms, bathrooms, and property type."
    );
    expect(metadata.title).not.toBe("Property Copilot — Map Browser");
  });
});
