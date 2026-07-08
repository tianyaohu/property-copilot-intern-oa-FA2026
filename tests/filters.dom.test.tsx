// @vitest-environment jsdom
import "@testing-library/jest-dom";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FilterBar } from "@/components/filters/FilterBar";
import { PropertyTypeFilter } from "@/components/filters/PropertyTypeFilter";
import type { PropertyFilter } from "@/lib/types";

// These exercise the filter UI's behaviour, which pure filter.test.ts can't:
// that filters compose from user clicks, that property type is multi-select
// (OR-of-many), and that the bar's active-count badge and "Clear all" reflect
// state. The FilterBar is controlled, so each harness owns the filter state and
// re-renders on change exactly like the real BrowsePage.

afterEach(cleanup);

function TypeHarness() {
  const [filter, setFilter] = useState<PropertyFilter>({});
  return (
    <>
      <PropertyTypeFilter filter={filter} onChange={setFilter} />
      {/* Surfaces the normalized value so assertions read the real state, not the DOM. */}
      <output data-testid="types">{JSON.stringify(filter.propertyTypes ?? [])}</output>
    </>
  );
}

function BarHarness({ initial }: { initial: PropertyFilter }) {
  const [filter, setFilter] = useState<PropertyFilter>(initial);
  return <FilterBar filter={filter} onChange={setFilter} />;
}

describe("PropertyTypeFilter (multi-select)", () => {
  it("adds each checked type and normalizes an empty selection to []", () => {
    render(<TypeHarness />);
    const types = () => screen.getByTestId("types").textContent;

    expect(types()).toBe("[]");

    fireEvent.click(screen.getByRole("checkbox", { name: "Apartment" }));
    expect(types()).toBe(JSON.stringify(["apartment"]));

    // OR-of-many: a second type joins the first rather than replacing it.
    fireEvent.click(screen.getByRole("checkbox", { name: "Condo" }));
    expect(types()).toBe(JSON.stringify(["apartment", "condo"]));

    // Unchecking removes just that type, leaving the rest of the selection.
    fireEvent.click(screen.getByRole("checkbox", { name: "Apartment" }));
    expect(types()).toBe(JSON.stringify(["condo"]));

    // Clearing the last type collapses back to "no type filter" (undefined -> []).
    fireEvent.click(screen.getByRole("checkbox", { name: "Condo" }));
    expect(types()).toBe("[]");
  });
});

describe("FilterBar active state + reset", () => {
  it("shows the active-category count and clears every dimension at once", () => {
    // Two active categories (bedrooms + property type); price counts as one.
    render(<BarHarness initial={{ propertyTypes: ["condo"], bedrooms: 2 }} />);

    // Master chip shows the count badge; the rooms/type chips show their values.
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("2+ bd")).toBeInTheDocument();
    expect(screen.getByText("Condo")).toBeInTheDocument();

    const clearAll = screen.getByRole("button", { name: "Clear all" });
    fireEvent.click(clearAll);

    // Everything resets: chips fall back to their placeholder labels and the
    // count badge + "Clear all" affordance disappear.
    expect(screen.queryByRole("button", { name: "Clear all" })).not.toBeInTheDocument();
    expect(screen.queryByText("Condo")).not.toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Beds & baths")).toBeInTheDocument();
  });
});
