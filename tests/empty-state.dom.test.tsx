// @vitest-environment jsdom
import "@testing-library/jest-dom";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/ui/EmptyState";

afterEach(cleanup);

describe("EmptyState", () => {
  it("exposes a danger tone as an alert with danger text, not only an unused icon slot", () => {
    const { container } = render(
      <EmptyState tone="danger" title="Couldn't load listings" description="Viewport too large; zoom in" />
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Couldn't load listings");
    const title = screen.getByRole("heading", { name: "Couldn't load listings" });
    expect(title.className).toContain("text-danger");
    expect(container.firstElementChild?.className).toContain("border-danger");
  });

  it("announces a non-error empty state and gives it a heading", () => {
    render(<EmptyState title="No listings match your search" description="Pan or zoom the map to explore other areas." />);

    expect(screen.getByRole("status")).toHaveTextContent("No listings match your search");
    expect(screen.getByRole("heading", { name: "No listings match your search" })).toBeInTheDocument();
  });

  it("wraps a long error string instead of letting it overflow the phone column", () => {
    render(
      <EmptyState
        tone="danger"
        title="Couldn't load listings"
        description="https://example.invalid/this-error-token-has-no-spaces-and-used-to-overflow"
      />
    );
    const description = screen.getByText(/this-error-token/);
    expect(description.className).toContain("break-words");
  });
});
