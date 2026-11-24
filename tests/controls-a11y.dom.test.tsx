// @vitest-environment jsdom
import "@testing-library/jest-dom";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Checkbox } from "@/components/ui/Checkbox";
import { Segmented } from "@/components/ui/Segmented";
import { PriceFilter } from "@/components/filters/PriceFilter";
import HomePage from "@/app/page";
import NotFound from "@/app/not-found";

afterEach(cleanup);

describe("small-screen controls", () => {
  it("gives a checkbox row the 44px touch height used by the other filter controls", () => {
    render(<Checkbox label="Use exact match" />);
    const row = screen.getByText("Use exact match").closest("label");
    expect(row?.className).toContain("max-sm:min-h-11");
  });

  it("draws a visible focus ring on a segmented option", () => {
    render(
      <Segmented
        ariaLabel="Bedrooms"
        options={[{ value: 2, label: "2" }]}
        value={undefined}
        onChange={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: "2" }).className).toContain("focus-visible:ring-accent");
  });

  it("marks only the invalid price field and points it at the alert", () => {
    render(<PriceFilter filter={{ minRent: 1500 }} onChange={() => {}} />);
    const minimum = screen.getByLabelText("Minimum");
    const maximum = screen.getByLabelText("Maximum");

    fireEvent.change(maximum, { target: { value: "nope" } });

    const alert = screen.getByRole("alert");
    expect(minimum).not.toHaveAttribute("aria-invalid", "true");
    expect(maximum).toHaveAttribute("aria-invalid", "true");
    expect(maximum).toHaveAttribute("aria-describedby", alert.id);
    expect(minimum).not.toHaveAttribute("aria-describedby");
    expect(maximum.className).toContain("aria-invalid:border-danger");
  });

  it("marks both price fields when the range is inverted", () => {
    render(<PriceFilter filter={{}} onChange={() => {}} />);
    fireEvent.change(screen.getByLabelText("Minimum"), { target: { value: "3000" } });
    fireEvent.change(screen.getByLabelText("Maximum"), { target: { value: "2000" } });

    expect(screen.getByLabelText("Minimum")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Maximum")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(/more than maximum/i);
  });
});

describe("home page link", () => {
  it("gives Browse listings a visible focus ring and a 44px target", () => {
    render(<HomePage />);
    const link = screen.getByRole("link", { name: "Browse listings" });
    expect(link.className).toContain("focus-visible:ring-accent");
    expect(link.className).toContain("min-h-11");
  });

  it("gives the missing-page link the same target", () => {
    render(<NotFound />);
    const link = screen.getByRole("link", { name: "Browse listings" });
    expect(link.className).toContain("focus-visible:ring-accent");
    expect(link.className).toContain("min-h-11");
  });
});
