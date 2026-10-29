// @vitest-environment jsdom
import "@testing-library/jest-dom";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FilterBar } from "@/components/filters/FilterBar";
import { MOBILE_SHEET_MEDIA } from "@/lib/mobileViewport";
import type { PropertyFilter } from "@/lib/types";

// A phone-sized layout viewport, and a visual viewport the software keyboard
// can shrink. jsdom has neither matchMedia nor visualViewport.
function installViewport(width: number, height: number) {
  const listeners = new Map<string, Set<() => void>>();
  const visualViewport = {
    width,
    height,
    offsetTop: 0,
    offsetLeft: 0,
    addEventListener(type: string, fn: () => void) {
      const set = listeners.get(type) ?? new Set<() => void>();
      set.add(fn);
      listeners.set(type, set);
    },
    removeEventListener(type: string, fn: () => void) {
      listeners.get(type)?.delete(fn);
    },
    dispatch(type: string) {
      listeners.get(type)?.forEach((fn) => fn());
    }
  };

  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
  Object.defineProperty(window, "visualViewport", { configurable: true, value: visualViewport });
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

  return visualViewport;
}

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

function BarHarness() {
  const [filter, setFilter] = useState<PropertyFilter>({});
  return <FilterBar filter={filter} onChange={setFilter} />;
}

describe("mobile filter sheet", () => {
  it("keeps the price filter open when a keyboard resize fires, and lifts the sheet by the visualViewport inset", () => {
    const visualViewport = installViewport(390, 844);
    render(<BarHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Price" }));
    const dialog = () => screen.getByRole("dialog", { name: "Price range" });

    expect(dialog()).toBeInTheDocument();

    // Android Chrome shrinks the layout viewport and fires window `resize`
    // when the keyboard opens. The anchored popover treats every resize as
    // "dismiss", so the dialog unmounts under the user's fingers.
    fireEvent(window, new Event("resize"));
    expect(dialog()).toBeInTheDocument();

    // Opens as a bottom sheet, not the anchored popover, and locks the page
    // behind it so the keyboard can't scroll the listing out from under it.
    expect(dialog()).toHaveAttribute("data-presentation", "sheet");
    expect(document.body.style.overflow).toBe("hidden");
    expect(dialog().className).toContain("safe-area-inset-bottom");

    // iOS leaves innerHeight alone and shrinks visualViewport instead. The
    // sheet's bottom edge has to track that inset or the inputs sit under
    // the keyboard. 844 - 420 = 424px of keyboard.
    visualViewport.height = 420;
    act(() => visualViewport.dispatch("resize"));

    expect(dialog()).toHaveAttribute("data-keyboard-inset", "424");
    expect(dialog().style.bottom).toBe("424px");
    // Home-indicator padding only applies when the keyboard is closed; the
    // keyboard already covers that inset.
    expect(dialog().className).not.toContain("safe-area-inset-bottom");

    // 16px text so iOS Safari does not zoom the page (and fire another
    // resize) on focus. Desktop keeps text-sm.
    const minimum = screen.getByLabelText("Minimum");
    expect(minimum.className).toContain("text-base");
    expect(minimum.className).toContain("sm:text-sm");
  });

  it("opens bedrooms as a full-width sheet instead of a 384px panel clipped on a 375px screen", () => {
    installViewport(375, 667);
    render(<BarHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Beds & baths" }));
    const dialog = screen.getByRole("dialog", { name: "Bedrooms & bathrooms" });

    expect(dialog).toHaveAttribute("data-presentation", "sheet");
    // Unfixed popover measured left: -17px and width: 384px on this viewport
    // (`position: fixed; top: 8px; left: -17px; width: 384px`), so Studio sat
    // off the left edge of a 375px screen.
    expect(dialog.style.width).not.toBe("384px");
    expect(dialog.style.left).not.toBe("-17px");
    // Studio is the first bedroom segment — it has to be on screen, not
    // hanging off the left edge of a too-wide popover.
    expect(screen.getByRole("button", { name: "Studio" })).toBeVisible();
  });

  it("still dismisses the anchored popover on resize at desktop widths", () => {
    installViewport(1280, 800);
    render(<BarHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Price" }));
    expect(screen.getByRole("dialog", { name: "Price range" })).toBeInTheDocument();

    fireEvent(window, new Event("resize"));
    expect(screen.queryByRole("dialog", { name: "Price range" })).not.toBeInTheDocument();
  });
});
