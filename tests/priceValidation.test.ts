import { describe, expect, it } from "vitest";
import { validatePriceRange } from "../lib/priceValidation";

// The frontend mirror of the backend's validateFilter rent rules. The backend
// stays the source of truth, but this UX guard runs on every keystroke, so it
// is worth pinning on its own.
describe("validatePriceRange", () => {
  it("returns null when both bounds are absent", () => {
    expect(validatePriceRange(undefined, undefined)).toBeNull();
  });

  it("returns null for a min-only or max-only bound", () => {
    expect(validatePriceRange(1000, undefined)).toBeNull();
    expect(validatePriceRange(undefined, 3000)).toBeNull();
  });

  it("allows a normal range and an equal min/max", () => {
    expect(validatePriceRange(1000, 3000)).toBeNull();
    expect(validatePriceRange(2000, 2000)).toBeNull();
  });

  it("rejects a negative minimum", () => {
    expect(validatePriceRange(-1, 3000)).toBe("Minimum rent can't be negative.");
  });

  it("rejects a negative maximum", () => {
    expect(validatePriceRange(undefined, -1)).toBe("Maximum rent can't be negative.");
  });

  it("rejects an inverted range", () => {
    expect(validatePriceRange(3000, 2000)).toBe("Minimum rent can't be more than maximum rent.");
  });
});
