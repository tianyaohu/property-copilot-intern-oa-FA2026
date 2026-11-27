// @vitest-environment jsdom
import "@testing-library/jest-dom";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PropertyTypeFilter } from "@/components/filters/PropertyTypeFilter";

afterEach(cleanup);

describe("PropertyTypeFilter", () => {
  it("names the checklist so the boxes are not four unlabeled toggles", () => {
    render(<PropertyTypeFilter filter={{}} onChange={() => {}} />);

    const group = screen.getByRole("group", { name: "Property type" });
    expect(group).toContainElement(screen.getByRole("checkbox", { name: "Apartment" }));
    expect(group).toContainElement(screen.getByRole("checkbox", { name: "Townhouse" }));
  });
});
