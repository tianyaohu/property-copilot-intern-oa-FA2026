// @vitest-environment jsdom
import "@testing-library/jest-dom";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FilterBar } from "@/components/filters/FilterBar";
import { MOBILE_SHEET_MEDIA } from "@/lib/mobileViewport";
import type { PropertyFilter } from "@/lib/types";

function installViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: query === MOBILE_SHEET_MEDIA && width <= 639,
      media: query,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() {
        return false;
      }
    })
  });
}

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

function Bar() {
  const [filter, setFilter] = useState<PropertyFilter>({});
  return <FilterBar filter={filter} onChange={setFilter} />;
}

describe("filter dialogs", () => {
  it("moves focus into the desktop popover when a chip opens it", () => {
    installViewport(1280, 800);
    render(<Bar />);

    const price = screen.getByRole("button", { name: "Price" });
    price.focus();
    fireEvent.click(price);

    const dialog = screen.getByRole("dialog", { name: "Price range" });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("exposes the master filter sections as headings", () => {
    installViewport(1280, 800);
    render(<Bar />);
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));

    expect(screen.getByRole("heading", { name: "Price range" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Rooms" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Property type" })).toBeInTheDocument();
  });

  it("keeps the phone sheet scrim a dark overlay, not a wash of the text color", () => {
    installViewport(390, 844);
    render(<Bar />);
    fireEvent.click(screen.getByRole("button", { name: "Price" }));

    const dismiss = screen.getByRole("button", { name: "Dismiss" });
    // bg-fg/40 follows the text color, so a dark theme turns the scrim white.
    expect(dismiss.className).toContain("bg-black/40");
    expect(dismiss.className).not.toContain("bg-fg/40");
  });
});
