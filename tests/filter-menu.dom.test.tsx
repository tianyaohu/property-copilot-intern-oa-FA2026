// @vitest-environment jsdom
import "@testing-library/jest-dom";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FilterBar } from "@/components/filters/FilterBar";
import type { PropertyFilter } from "@/lib/types";

beforeEach(() => {
  // Wide and tall: the anchored popover, not the phone sheet.
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({
      matches: false,
      media: "",
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() {
        return false;
      }
    })
  });
});

afterEach(cleanup);

function Bar() {
  const [filter, setFilter] = useState<PropertyFilter>({});
  return <FilterBar filter={filter} onChange={setFilter} />;
}

describe("filter menu focus", () => {
  it("closes the popover when keyboard focus moves to another chip", () => {
    render(<Bar />);
    fireEvent.click(screen.getByRole("button", { name: "Price" }));
    expect(screen.getByRole("dialog", { name: "Price range" })).toBeInTheDocument();

    const beds = screen.getByRole("button", { name: "Beds & baths" });
    act(() => {
      beds.focus();
    });

    expect(screen.queryByRole("dialog", { name: "Price range" })).not.toBeInTheDocument();
    expect(beds).toHaveFocus();
  });

  it("does not pull focus back when the press lands on another chip", () => {
    render(<Bar />);
    const price = screen.getByRole("button", { name: "Price" });
    fireEvent.click(price);
    // Focus is inside the open dialog, which is where Chrome still is when
    // mousedown fires — the pressed chip is focused only after mousedown
    // listeners return. Recording the pointer target has to win over that.
    screen.getByRole("button", { name: "Done" }).focus();

    const beds = screen.getByRole("button", { name: "Beds & baths" });
    act(() => {
      beds.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    expect(price).not.toHaveFocus();
  });

  it("returns focus to the price chip when Escape dismisses the popover", () => {
    render(<Bar />);
    const price = screen.getByRole("button", { name: "Price" });
    price.focus();
    fireEvent.click(price);
    screen.getByRole("button", { name: "Done" }).focus();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "Price range" })).not.toBeInTheDocument();
    expect(price).toHaveFocus();
  });
});
