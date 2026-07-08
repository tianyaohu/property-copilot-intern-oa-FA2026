import { describe, expect, it } from "vitest";
import { CAD, formatCompactRent } from "../lib/format";

describe("formatCompactRent", () => {
  it("passes values under 1000 through, rounded, with no suffix", () => {
    expect(formatCompactRent(950)).toBe("950");
    expect(formatCompactRent(999.4)).toBe("999");
  });

  it("drops the trailing .0 for round thousands", () => {
    expect(formatCompactRent(1000)).toBe("1k");
    expect(formatCompactRent(3000)).toBe("3k");
  });

  it("keeps one decimal for non-round thousands", () => {
    expect(formatCompactRent(2400)).toBe("2.4k");
    expect(formatCompactRent(2450)).toBe("2.5k");
  });

  it("rounds to the nearest hundred before formatting", () => {
    expect(formatCompactRent(2950)).toBe("3k"); // 2950 -> 29.5 -> 30 -> "3k"
  });
});

describe("CAD", () => {
  it("formats whole dollars with grouping and no cents", () => {
    const out = CAD.format(2400);
    expect(out).toContain("2,400");
    expect(out).not.toMatch(/\.\d/); // no fractional digits
  });
});
