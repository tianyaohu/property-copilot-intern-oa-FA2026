import { beforeEach, describe, expect, test, vi } from "vitest";
import { handler } from "../backend/src/handlers";
import { route } from "../backend/src/router";

// The Lambda adapter's job is translation, not routing: unwrap the API Gateway
// (HTTP API v2) event, delegate to route(), wrap the result with CORS headers.
// Mocking route() lets these tests pin that translation layer down exactly.
vi.mock("../backend/src/router", () => ({ route: vi.fn() }));

const routeMock = vi.mocked(route);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Lambda handler", () => {
  test("OPTIONS preflight short-circuits to 204 without touching the router", async () => {
    const res = await handler({ requestContext: { http: { method: "OPTIONS" } } });

    expect(res.statusCode).toBe(204);
    expect(res.body).toBe("");
    expect(res.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(routeMock).not.toHaveBeenCalled();
  });

  test("delegates method, path, and query to the router and JSON-encodes the body", async () => {
    routeMock.mockResolvedValue({ statusCode: 200, body: { ok: true } });

    const res = await handler({
      rawPath: "/properties",
      queryStringParameters: { bbox: "49,-124,50,-122", minRent: "2000" },
      requestContext: { http: { method: "GET" } }
    });

    expect(routeMock).toHaveBeenCalledWith({
      method: "GET",
      path: "/properties",
      query: { bbox: "49,-124,50,-122", minRent: "2000" }
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe(JSON.stringify({ ok: true }));
    expect(res.headers["Content-Type"]).toBe("application/json");
    expect(res.headers["Access-Control-Allow-Origin"]).toBe("*");
  });

  test("fills defaults for a sparse event: GET, root path, empty query", async () => {
    routeMock.mockResolvedValue({ statusCode: 404, body: { error: "Not found" } });

    const res = await handler({ queryStringParameters: null });

    expect(routeMock).toHaveBeenCalledWith({ method: "GET", path: "/", query: {} });
    expect(res.statusCode).toBe(404);
  });

  test("router status codes pass through untouched", async () => {
    routeMock.mockResolvedValue({ statusCode: 400, body: { error: "bbox is required" } });

    const res = await handler({
      rawPath: "/properties",
      requestContext: { http: { method: "GET" } }
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: "bbox is required" });
  });

  test("a throwing router becomes a 500 with CORS headers intact", async () => {
    // The handler logs the error before answering 500; keep test output clean.
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    routeMock.mockRejectedValue(new Error("dynamo down"));

    const res = await handler({
      rawPath: "/properties",
      requestContext: { http: { method: "GET" } }
    });

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body)).toEqual({ error: "Internal server error" });
    expect(res.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(errorSpy).toHaveBeenCalled();
  });
});
