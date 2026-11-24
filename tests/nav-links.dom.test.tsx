// @vitest-environment jsdom
import "@testing-library/jest-dom";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SiteHeader } from "@/app/layout";

afterEach(cleanup);

describe("header navigation", () => {
  it("gives each header link a visible focus ring and a 44px touch target", () => {
    render(<SiteHeader />);

    for (const name of ["Property Copilot", "Browse"]) {
      const link = screen.getByRole("link", { name });
      expect(link.className).toContain("inline-flex");
      expect(link.className).toContain("focus-visible:ring-accent");
      expect(link.className).toContain("max-sm:min-h-11");
    }
  });
});
