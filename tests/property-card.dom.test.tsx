// @vitest-environment jsdom
import "@testing-library/jest-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PropertyCard } from "@/components/property/PropertyCard";
import { makeProperty } from "./fixtures";

afterEach(cleanup);

const photo = "https://example.com/listing.jpg";

describe("PropertyCard selection", () => {
  it("selects the listing from the keyboard and exposes the pressed state", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const property = makeProperty({
      id: "prop-9",
      title: "Garden suite",
      images: [photo]
    });

    const { rerender } = render(
      <PropertyCard property={property} onSelect={onSelect} active={false} />
    );

    const card = screen.getByRole("button", { name: /Garden suite/ });
    expect(card).toHaveAttribute("aria-pressed", "false");
    expect(card.className).toContain("focus-visible:ring-accent");

    card.focus();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("prop-9");

    rerender(<PropertyCard property={property} onSelect={onSelect} active />);
    expect(screen.getByRole("button", { name: /Garden suite/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("does not render a sourceless image when the listing has no photos", () => {
    render(
      <PropertyCard
        property={makeProperty({ title: "Garden suite", images: [] })}
        onSelect={() => {}}
      />
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("No photo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Garden suite/ })).toBeInTheDocument();
  });

  it("replaces a photo that fails to load instead of leaving a broken image", () => {
    render(
      <PropertyCard
        property={makeProperty({ title: "Garden suite", images: [photo] })}
        onSelect={() => {}}
      />
    );

    fireEvent.error(screen.getByRole("img", { name: "Garden suite" }));

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("No photo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Garden suite/ })).toBeInTheDocument();
  });

  it("does not throw when images is missing and does not format a non-finite rent as currency", () => {
    const property = makeProperty({ title: "Garden suite", rent: Number.NaN });
    delete (property as { images?: string[] }).images;

    expect(() => render(<PropertyCard property={property} onSelect={() => {}} />)).not.toThrow();
    expect(screen.queryByText(/\$NaN/)).not.toBeInTheDocument();
    expect(screen.getByText("Rent unavailable")).toBeInTheDocument();
  });
});
