// @vitest-environment jsdom
import "@testing-library/jest-dom";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MobileViewToggle } from "@/components/map/MobileViewToggle";

afterEach(cleanup);

describe("MobileViewToggle", () => {
  it("announces which pane was just shown", () => {
    const { rerender } = render(<MobileViewToggle value="map" onChange={() => {}} />);

    const live = screen.getByText("Showing the map");
    expect(live).toHaveAttribute("aria-live", "polite");

    rerender(<MobileViewToggle value="list" onChange={() => {}} />);
    expect(screen.getByText("Showing the list")).toHaveAttribute("aria-live", "polite");
    // The switch stays two buttons named Map and List. The announcement is
    // not part of those names.
    expect(screen.getByRole("button", { name: "Map" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "List" })).toBeInTheDocument();
  });
});
