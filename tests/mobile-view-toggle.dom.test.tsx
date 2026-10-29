// @vitest-environment jsdom
import "@testing-library/jest-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

// The browse page renders the real switcher. The map is mocked so this file
// does not boot MapLibre; the padding assertion only needs the page shell.
vi.mock("@/lib/propertiesQuery", () => ({ loadProperties: vi.fn() }));
vi.mock("@/components/map/MapPanel", () => ({
  MapPanel: () => <div data-testid="map-panel" />
}));

import BrowsePage from "@/app/browse/page";
import { MobileViewToggle } from "@/components/map/MobileViewToggle";

// Measured on a 375×667 phone. The selected card is 258px tall, and switching
// to the list scrolls it to the vertical center (top ≈ 204). The switcher, as
// it shipped, is a 75px control pinned to that same center.
const VIEWPORT_HEIGHT = 667;
const CARD_HEIGHT = 258;
const CARD_TOP = (VIEWPORT_HEIGHT - CARD_HEIGHT) / 2;
const CARD_BOTTOM = CARD_TOP + CARD_HEIGHT;
const CENTERED_SWITCHER_HEIGHT = 75;
const BOTTOM_BAR_HEIGHT = 44 + 8 + 12; // min-h-11 + pt-2 + 0.75rem
const HOME_INDICATOR_INSET = 34;

function verticalOverlap(top: number, height: number): number {
  return Math.max(0, Math.min(CARD_BOTTOM, top + height) - Math.max(CARD_TOP, top));
}

/**
 * Where the fixed switcher sits, from the classes that pin it. jsdom does not
 * lay out Tailwind, so this is the same math the screenshot measured: a
 * `top-1/2 -translate-y-1/2` box lands on the centered card, and a `bottom-0`
 * bar of one 44px control plus its inset does not.
 */
function switcherBox(fixedClass: string, buttonClass: string): { top: number; height: number } {
  if (fixedClass.includes("top-1/2")) {
    return {
      height: CENTERED_SWITCHER_HEIGHT,
      top: VIEWPORT_HEIGHT / 2 - CENTERED_SWITCHER_HEIGHT / 2
    };
  }
  const isBottomBar =
    fixedClass.includes("bottom-0") &&
    fixedClass.includes("pt-2") &&
    fixedClass.includes("0.75rem") &&
    buttonClass.includes("min-h-11");
  if (!isBottomBar) {
    throw new Error(`switcher is not pinned to the bottom edge: ${fixedClass}`);
  }
  return { height: BOTTOM_BAR_HEIGHT, top: VIEWPORT_HEIGHT - BOTTOM_BAR_HEIGHT };
}

afterEach(cleanup);

describe("mobile map/list switcher", () => {
  it("does not cover the listing that map → list scrolls to the center", () => {
    render(<MobileViewToggle value="list" onChange={() => {}} />);
    const mapButton = screen.getByRole("button", { name: "Map" });
    const fixed = mapButton.closest(".fixed");
    expect(fixed).not.toBeNull();

    const box = switcherBox(fixed!.className, mapButton.className);
    // The centered control overlaps the revealed card by its full 75px height.
    expect(verticalOverlap(box.top, box.height)).toBe(0);
    // A 34px home-indicator inset grows the bar upward and must still clear it.
    expect(verticalOverlap(box.top - HOME_INDICATOR_INSET, box.height + HOME_INDICATOR_INSET)).toBe(0);

    expect(mapButton.className).toContain("min-h-11");
    expect(screen.getByRole("button", { name: "List" }).className).toContain("min-h-11");
    expect(fixed!.className).toContain("safe-area-inset-bottom");
    // The full-bleed bar must not eat map drags; only the buttons are tappable.
    expect(fixed!.className).toContain("pointer-events-none");
    expect(mapButton.parentElement?.className).toContain("pointer-events-auto");
  });

  it("pads the page so the last card can scroll out from under the bar", () => {
    render(<BrowsePage />);
    const section = document.querySelector("section");
    expect(section?.className).toContain("env(safe-area-inset-bottom)");
    expect(section?.className).toContain("sm:pb-0");
  });
});
