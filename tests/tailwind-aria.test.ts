import { describe, expect, it } from "vitest";
import config from "../tailwind.config";

describe("tailwind aria variants", () => {
  it("registers aria-invalid so an invalid field can paint the danger border", () => {
    // Tailwind 3's default `theme.aria` has checked/disabled/expanded and no
    // `invalid`. Without this entry, `aria-invalid:border-danger` is extracted
    // from Input and then discarded, and a focused invalid rent field stays
    // accent blue.
    const aria = config.theme?.extend?.aria;
    expect(aria).toMatchObject({ invalid: 'invalid="true"' });
  });
});
