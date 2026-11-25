// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton } from "@/components/ui/Skeleton";

describe("Skeleton", () => {
  it("stops the infinite pulse when the user prefers reduced motion", () => {
    const { container } = render(<Skeleton />);
    // animate-pulse runs for as long as the listing grid is loading, with no
    // pause control. WCAG 2.2.2 requires that animation to honor reduced motion.
    expect(container.firstElementChild?.className).toContain("motion-reduce:animate-none");
  });
});
