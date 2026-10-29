// @vitest-environment jsdom
import "@testing-library/jest-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

// Phone layout hides the list with Tailwind `hidden` while the map is showing.
// jsdom does not apply that CSS, so layout is simulated: an element inside
// `.hidden` has no box, and everything else does. That is what makes
// scrollIntoView a no-op until the user switches to the list.
// The browse page loads listings through loadProperties.
vi.mock("@/lib/propertiesQuery", () => ({ loadProperties: vi.fn() }));
vi.mock("@/components/map/MapPanel", () => ({
  MapPanel: ({
    onBoundsChange,
    onSelect
  }: {
    onBoundsChange?: (bbox: string) => void;
    onSelect?: (id: string | null) => void;
  }) => (
    <div>
      <button data-testid="move-a" onClick={() => onBoundsChange?.("49.0,-123.2,49.3,-122.8")}>
        move a
      </button>
      <button data-testid="select-garden" onClick={() => onSelect?.("prop-050")}>
        select garden
      </button>
      <button data-testid="select-first" onClick={() => onSelect?.("prop-001")}>
        select first
      </button>
    </div>
  )
}));

import BrowsePage from "@/app/browse/page";
import { loadProperties } from "@/lib/propertiesQuery";
import { makeProperty } from "./fixtures";

const fetchMock = vi.mocked(loadProperties);
const DEBOUNCE_MS = 350;

const listings = [
  makeProperty({ id: "prop-001", street: "5660 Granville St", city: "Vancouver", rent: 3627 }),
  makeProperty({ id: "prop-002", street: "4289 Cook Rd", city: "Richmond", rent: 2704 }),
  makeProperty({ id: "prop-050", street: "5672 Garden City Rd", city: "Richmond", rent: 1559 })
];

const scrollIntoView = vi.fn();

function layoutForHiddenClass(this: HTMLElement): DOMRectList {
  const hidden = this.closest(".hidden");
  return (hidden ? [] : [{}]) as unknown as DOMRectList;
}

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ status: "success", properties: listings, truncated: false });
  scrollIntoView.mockReset();
  HTMLElement.prototype.scrollIntoView = scrollIntoView;
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockImplementation(layoutForHiddenClass);
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false
  }));
});

afterEach(() => {
  cleanup();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function renderLoaded() {
  render(<BrowsePage />);
  await act(async () => {
    fireEvent.click(screen.getByTestId("move-a"));
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
  });
  expect(screen.getByText(/5672 Garden City Rd/)).toBeInTheDocument();
}

describe("mobile map → list selection", () => {
  it("keeps the selection and centers that card only once the list is shown", async () => {
    await renderLoaded();
    scrollIntoView.mockClear();

    await act(async () => {
      fireEvent.click(screen.getByTestId("select-garden"));
    });

    const card = screen.getByText(/5672 Garden City Rd/).closest("article");
    expect(card).toHaveClass("ring-accent");
    // The list is display:none under the map view, so scrolling now cannot
    // reveal the card — and must not be treated as if it had.
    expect(scrollIntoView).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "List" }));
    });

    expect(card).toHaveClass("ring-accent");
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "center",
      inline: "nearest",
      behavior: "smooth"
    });
    expect(scrollIntoView.mock.instances.at(-1)).toBe(card);
  });

  it("uses the nearest scroll when the list is already on screen", async () => {
    await renderLoaded();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "List" }));
    });
    scrollIntoView.mockClear();

    await act(async () => {
      fireEvent.click(screen.getByTestId("select-first"));
    });

    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", behavior: "smooth" });
    const card = screen.getByText(/5660 Granville St/).closest("article");
    expect(scrollIntoView.mock.instances.at(-1)).toBe(card);
  });

  it("does not scroll the page on the stacked tablet layout", async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("640px") && query.includes("1023.98px"),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false
    }));

    await renderLoaded();
    // Show the list so the card has a layout box; the media query is what
    // suppresses the scroll, not visibility.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "List" }));
    });
    scrollIntoView.mockClear();

    await act(async () => {
      fireEvent.click(screen.getByTestId("select-garden"));
    });

    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
