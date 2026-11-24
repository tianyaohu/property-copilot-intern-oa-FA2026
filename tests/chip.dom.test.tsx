// @vitest-environment jsdom
import "@testing-library/jest-dom";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Chip } from "@/components/ui/Chip";

afterEach(cleanup);

function TwoFilters() {
  const [price, setPrice] = useState(true);
  const [rooms, setRooms] = useState(true);
  return (
    <>
      <Chip active={price} onClear={() => setPrice(false)}>
        $2,000+
      </Chip>
      <Chip active={rooms} onClear={() => setRooms(false)}>
        2+ bd
      </Chip>
    </>
  );
}

describe("Chip clear control", () => {
  it("names each clear control after its filter and keeps focus on the chip", () => {
    render(<TwoFilters />);

    const clearPrice = screen.getByRole("button", { name: "Clear $2,000+" });
    expect(screen.getByRole("button", { name: "Clear 2+ bd" })).toBeInTheDocument();

    clearPrice.focus();
    fireEvent.click(clearPrice);

    expect(screen.queryByRole("button", { name: "Clear $2,000+" })).not.toBeInTheDocument();
    expect(document.activeElement).toHaveTextContent("$2,000+");
    expect(screen.getByRole("button", { name: "Clear 2+ bd" })).toBeInTheDocument();
  });
});
