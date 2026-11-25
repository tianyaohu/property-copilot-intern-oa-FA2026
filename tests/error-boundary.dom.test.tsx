// @vitest-environment jsdom
import "@testing-library/jest-dom";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Error from "@/app/error";

afterEach(cleanup);

describe("route error boundary", () => {
  it("focuses a page heading and gives the retry control a phone-sized target", () => {
    render(<Error error={new Error("render failed")} reset={() => {}} />);

    const heading = screen.getByRole("heading", { name: "Something went wrong" });
    expect(heading.tagName).toBe("H1");
    expect(heading).toHaveFocus();
    expect(screen.getByRole("alert")).toBeInTheDocument();

    const retry = screen.getByRole("button", { name: "Try again" });
    expect(retry.className).toContain("max-sm:min-h-11");
  });
});
