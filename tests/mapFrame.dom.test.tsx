// @vitest-environment jsdom
import "@testing-library/jest-dom";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

// MapInner pulls in MapLibre, which needs WebGL. The loading shell is the
// frame the phone actually sizes; assert on that without constructing a map.
vi.mock("next/dynamic", () => ({
  default: (_loader: unknown, options?: { loading?: () => ReactNode }) => {
    const Loading = options?.loading;
    return function DynamicStub() {
      return Loading ? Loading() : null;
    };
  }
}));

import { MapPanel } from "@/components/map/MapPanel";

afterEach(cleanup);

describe("map frame", () => {
  it("sizes the phone map to the visual viewport instead of a fixed 70vh", () => {
    render(<MapPanel properties={[]} />);
    const frame = screen.getByText("Loading map…").parentElement;
    // 70vh starts below the title and filters, so on a phone it runs under
    // the fixed Map/List bar (measured overlap ~67px at 390×844).
    expect(frame?.className).not.toContain("h-[70vh]");
    expect(frame?.className).toContain("h-[calc(100dvh-28.5rem)]");
  });
});
