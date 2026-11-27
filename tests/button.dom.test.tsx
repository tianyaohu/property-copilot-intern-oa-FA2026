// @vitest-environment jsdom
import "@testing-library/jest-dom";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/Button";

afterEach(cleanup);

describe("Button touch target", () => {
  it("keeps every variant at least 44px on a phone", () => {
    render(
      <>
        <Button size="sm">Clear all filters</Button>
        <Button variant="ghost" size="sm">
          Try again
        </Button>
        <Button variant="link">Clear</Button>
      </>
    );

    for (const name of ["Clear all filters", "Try again", "Clear"]) {
      const button = screen.getByRole("button", { name });
      expect(button.className).toContain("max-sm:min-h-11");
      expect(button.className).toContain("max-sm:min-w-11");
    }
  });
});
