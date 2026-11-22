// @vitest-environment jsdom
import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PropertiesQueryResult } from "@/lib/propertiesQuery";
import { makeProperty } from "./fixtures";

vi.mock("@/lib/propertiesQuery", () => ({ loadProperties: vi.fn() }));
vi.mock("@/components/map/MapPanel", () => ({
  MapPanel: ({ onBoundsChange }: { onBoundsChange?: (bbox: string) => void }) => (
    <button data-testid="move-a" onClick={() => onBoundsChange?.("49.0,-123.2,49.3,-122.8")}>
      move a
    </button>
  )
}));

import BrowsePage from "@/app/browse/page";
import { loadProperties } from "@/lib/propertiesQuery";

const fetchMock = vi.mocked(loadProperties);
const DEBOUNCE_MS = 350;

function listingsFor(bedrooms: number | undefined) {
  if (bedrooms === 3) {
    return [makeProperty({ id: "wide", street: "Wide Three St", bedrooms: 3, rent: 3600 })];
  }
  return [makeProperty({ id: "narrow", street: "Narrow Two St", bedrooms: 2, rent: 3200 })];
}

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (input) => {
    const result: PropertiesQueryResult = {
      status: "success",
      properties: listingsFor(input.filter?.bedrooms),
      truncated: false
    };
    return result;
  });
  window.history.replaceState(null, "", "/browse?minRent=3000&maxRent=4500&bedrooms=2");
});

afterEach(() => {
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  window.history.replaceState(null, "", "/browse");
});

describe("BrowsePage filter address bar", () => {
  it("restores min rent, max rent, and bedrooms from the URL and keeps them there", async () => {
    render(<BrowsePage />);

    expect(screen.getByRole("button", { name: /3,000/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /4,500/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2+ bd" })).toBeInTheDocument();

    const params = new URLSearchParams(window.location.search);
    expect(params.get("minRent")).toBe("3000");
    expect(params.get("maxRent")).toBe("4500");
    expect(params.get("bedrooms")).toBe("2");
    expect(params.has("bedroomsExact")).toBe(false);

    await act(async () => void fireEvent.click(screen.getByTestId("move-a")));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        bbox: "49.0,-123.2,49.3,-122.8",
        filter: { minRent: 3000, maxRent: 4500, bedrooms: 2 }
      })
    );
    expect(screen.getByText(/Narrow Two St/)).toBeInTheDocument();
    expect(screen.getByText(/1 listing/)).toBeInTheDocument();
  });

  it("writes a bedroom change into the URL and reloads a different list", async () => {
    render(<BrowsePage />);

    await act(async () => void fireEvent.click(screen.getByTestId("move-a")));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    });
    expect(screen.getByText(/Narrow Two St/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "2+ bd" }));
    fireEvent.click(screen.getByRole("button", { name: "3" }));

    expect(new URLSearchParams(window.location.search).get("bedrooms")).toBe("3");
    expect(new URLSearchParams(window.location.search).get("minRent")).toBe("3000");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    });

    expect(screen.getByText(/Wide Three St/)).toBeInTheDocument();
    expect(screen.queryByText(/Narrow Two St/)).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filter: { minRent: 3000, maxRent: 4500, bedrooms: 3 }
      })
    );
  });
});
