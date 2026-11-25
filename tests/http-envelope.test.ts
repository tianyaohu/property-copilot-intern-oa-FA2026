import { beforeEach, describe, expect, test, vi } from "vitest";
import { handleApiRequest, handleNodeRequest } from "../backend/src/http";
import { route } from "../backend/src/router";

// Pin the envelope without exercising routing. The real router is covered
// by router.test.ts and by the unmocked local-pipeline cases in
// api-request.test.ts.
vi.mock("../backend/src/router", () => ({ route: vi.fn() }));

const routeMock = vi.mocked(route);

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("HTTP envelope", () => {
  test("OPTIONS is an empty 204 and does not call the router", async () => {
    const res = await handleApiRequest({ method: "OPTIONS", path: "/properties", query: {} });

    expect(res.statusCode).toBe(204);
    expect(res.body).toBe("");
    expect(res.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(routeMock).not.toHaveBeenCalled();
  });

  test("a 200 that is not the error envelope is JSON", async () => {
    routeMock.mockResolvedValue({ statusCode: 200, body: { ok: true } });

    const res = await handleApiRequest({ method: "GET", path: "/health", query: {} });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
    expect(res.headers["Content-Type"]).toBe("application/json");
  });

  test("a client error with exactly { error } passes through", async () => {
    routeMock.mockResolvedValue({ statusCode: 404, body: { error: "Not found" } });

    const res = await handleApiRequest({ method: "GET", path: "/nope", query: {} });

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body)).toEqual({ error: "Not found" });
  });

  test("a 200 error envelope becomes an internal error", async () => {
    routeMock.mockResolvedValue({ statusCode: 200, body: { error: "nope" } });

    const res = await handleApiRequest({ method: "GET", path: "/health", query: {} });

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body)).toEqual({ error: "Internal server error" });
  });

  test("a client error whose body is not the envelope becomes an internal error", async () => {
    const bodies = [
      { message: "nope" },
      { error: "" },
      { error: "nope", detail: true },
      "nope",
      null
    ];

    for (const body of bodies) {
      routeMock.mockResolvedValueOnce({ statusCode: 400, body });
      const res = await handleApiRequest({ method: "GET", path: "/properties", query: {} });
      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res.body)).toEqual({ error: "Internal server error" });
    }
  });

  test("a status outside 200 and the client errors becomes an internal error", async () => {
    routeMock.mockResolvedValue({ statusCode: 418, body: { error: "nope" } });

    const res = await handleApiRequest({ method: "GET", path: "/properties", query: {} });

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body)).toEqual({ error: "Internal server error" });
  });

  test("a 200 body that does not serialize becomes an internal error", async () => {
    routeMock.mockResolvedValue({ statusCode: 200, body: undefined });

    const missing = await handleApiRequest({ method: "GET", path: "/health", query: {} });
    expect(missing.statusCode).toBe(500);
    expect(JSON.parse(missing.body)).toEqual({ error: "Internal server error" });

    routeMock.mockResolvedValue({ statusCode: 200, body: { n: BigInt(1) } });
    const bigint = await handleApiRequest({ method: "GET", path: "/health", query: {} });
    expect(bigint.statusCode).toBe(500);
    expect(JSON.parse(bigint.body)).toEqual({ error: "Internal server error" });
  });

  test("a thrown router error becomes an internal error and keeps CORS", async () => {
    routeMock.mockRejectedValue(new Error("dynamo down"));

    const res = await handleApiRequest({ method: "GET", path: "/properties", query: {} });

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body)).toEqual({ error: "Internal server error" });
    expect(res.headers["Access-Control-Allow-Origin"]).toBe("*");
  });

  test("a rejected request target does not reach the router", async () => {
    const res = await handleNodeRequest("GET", "//properties");

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: "Invalid request target" });
    expect(routeMock).not.toHaveBeenCalled();
  });
});
