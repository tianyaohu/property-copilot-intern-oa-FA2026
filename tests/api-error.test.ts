import { describe, expect, test } from "vitest";
import { clientError } from "../backend/src/api-response";
import { isApiErrorBody as backendIsApiErrorBody } from "../backend/src/types";
import { isApiErrorBody } from "../shared/apiError";

describe("API error envelope", () => {
  test("the backend re-exports the shared predicate", () => {
    expect(backendIsApiErrorBody).toBe(isApiErrorBody);
  });

  test("accepts exactly one non-empty error string", () => {
    expect(isApiErrorBody({ error: "Viewport too large; zoom in" })).toBe(true);
    expect(isApiErrorBody({ error: "Not found" })).toBe(true);
  });

  test("rejects a body the client would misread", () => {
    expect(isApiErrorBody({ error: "" })).toBe(false);
    expect(isApiErrorBody({ error: "   " })).toBe(false);
    expect(isApiErrorBody({ error: "Not found", detail: true })).toBe(false);
    expect(isApiErrorBody({ message: "Not found" })).toBe(false);
    expect(isApiErrorBody({ error: 404 })).toBe(false);
    expect(isApiErrorBody(["Not found"])).toBe(false);
    expect(isApiErrorBody(null)).toBe(false);
    expect(isApiErrorBody(undefined)).toBe(false);
    expect(isApiErrorBody("Not found")).toBe(false);
  });

  test("clientError refuses a blank message", () => {
    expect(() => clientError(400, "   ")).toThrow(/non-empty/);
  });
});
