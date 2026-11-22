// @vitest-environment jsdom
import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

// Phone layout puts `hidden` on the list pane while the map is showing.
// jsdom does not apply Tailwind, so "visible on the phone map" means the node
// is not inside that pane. The viewport fetch is mocked at loadProperties.
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
import { makeProperty } from "./fixtures";

const fetchMock = vi.mocked(loadProperties);
const DEBOUNCE_MS = 350;

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

async function settle(pageBbox = true) {
  render(<BrowsePage />);
  if (pageBbox) {
    await act(async () => {
      fireEvent.click(screen.getByTestId("move-a"));
    });
  }
  await act(async () => {
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
  });
}

describe("browse status on the phone map", () => {
  it("renders a viewport error outside the pane hidden on the map view, with a retry", async () => {
    fetchMock.mockResolvedValue({ status: "error", message: "Viewport too large; zoom in" });
    await settle();

    const message = screen.getByText("Viewport too large; zoom in");
    // The list pane carries `hidden` while the phone is on the map. The error
    // used to live in that pane, so the default map view showed an empty map.
    expect(message.closest(".hidden")).toBeNull();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("retries a failed load without requiring a pan", async () => {
    fetchMock
      .mockResolvedValueOnce({ status: "error", message: "Viewport too large; zoom in" })
      .mockResolvedValueOnce({
        status: "success",
        properties: [makeProperty({ street: "100 Retry St", city: "Vancouver" })],
        truncated: false
      });
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/100 Retry St/)).toBeInTheDocument();
    expect(screen.queryByText("Viewport too large; zoom in")).not.toBeInTheDocument();
  });

  it("keeps the result-cap hint outside the pane hidden on the map view", async () => {
    fetchMock.mockResolvedValue({
      status: "success",
      properties: [makeProperty()],
      truncated: true
    });
    await settle();

    const hint = screen.getByText(/zoom in to see all/i);
    expect(hint.closest(".hidden")).toBeNull();
  });
});
