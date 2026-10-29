// @vitest-environment jsdom
import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

// The viewport fetch effect debounces 350ms so rapid pan/zoom/filter changes
// become one request, and aborts the superseded request. Query building and
// the typed result live in lib/propertiesQuery; this mocks that boundary and
// the WebGL map (MapLibre can't run in jsdom) and drives bounds via the mock.
vi.mock("@/lib/propertiesQuery", () => ({ loadProperties: vi.fn() }));
vi.mock("@/components/map/MapPanel", () => ({
  MapPanel: ({ onBoundsChange }: { onBoundsChange?: (bbox: string) => void }) => (
    <div>
      <button data-testid="move-a" onClick={() => onBoundsChange?.("49.0,-123.2,49.3,-122.8")}>
        move a
      </button>
      <button data-testid="move-b" onClick={() => onBoundsChange?.("49.1,-123.1,49.2,-122.9")}>
        move b
      </button>
    </div>
  )
}));

import BrowsePage from "@/app/browse/page";
import { loadProperties } from "@/lib/propertiesQuery";

const fetchMock = vi.mocked(loadProperties);
const DEBOUNCE_MS = 350;

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
  // Never resolves: we assert on the call and its abort signal, not the result.
  fetchMock.mockReturnValue(new Promise<never>(() => {}));
});

afterEach(() => {
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("BrowsePage viewport fetching", () => {
  it("does not query until the map reports its first bounds", () => {
    render(<BrowsePage />);
    act(() => void vi.advanceTimersByTime(DEBOUNCE_MS));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("debounces rapid viewport changes into a single request for the latest view", async () => {
    render(<BrowsePage />);

    await act(async () => void fireEvent.click(screen.getByTestId("move-a")));
    await act(async () => void fireEvent.click(screen.getByTestId("move-b")));
    // Both moves landed inside the debounce window — nothing fired yet.
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => void vi.advanceTimersByTime(DEBOUNCE_MS));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ bbox: "49.1,-123.1,49.2,-122.9" })
    );
  });

  it("aborts the in-flight request when the viewport changes again", async () => {
    render(<BrowsePage />);

    await act(async () => void fireEvent.click(screen.getByTestId("move-a")));
    await act(async () => void vi.advanceTimersByTime(DEBOUNCE_MS));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const firstSignal = fetchMock.mock.calls[0][0]?.signal as AbortSignal;
    expect(firstSignal.aborted).toBe(false);

    // A newer viewport supersedes the pending request; its effect cleanup aborts it.
    await act(async () => void fireEvent.click(screen.getByTestId("move-b")));
    expect(firstSignal.aborted).toBe(true);

    await act(async () => void vi.advanceTimersByTime(DEBOUNCE_MS));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
