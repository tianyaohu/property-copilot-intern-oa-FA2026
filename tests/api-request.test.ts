import { describe, expect, test } from "vitest";
import { apiRequestFromHttpApi, apiRequestFromNode } from "../backend/src/api-request";
import { handleNodeRequest } from "../backend/src/http";

describe("Lambda and local request adapters", () => {
  test("a sparse event and a missing request target are the same GET /", () => {
    expect(apiRequestFromNode(undefined, undefined)).toEqual(apiRequestFromHttpApi({}));
    expect(apiRequestFromHttpApi({})).toEqual({
      ok: true,
      request: { method: "GET", path: "/", query: {} }
    });
  });

  test("repeated query keys arrive as the comma-joined map payload 2.0 already builds", () => {
    const fromNode = apiRequestFromNode(
      "GET",
      "/properties?bbox=49,-124,50,-122&minRent=1000&minRent=2000&bedrooms=0"
    );
    expect(fromNode.ok).toBe(true);
    if (!fromNode.ok) return;

    const fromLambda = apiRequestFromHttpApi({
      rawPath: "/properties",
      queryStringParameters: fromNode.request.query,
      requestContext: { http: { method: "GET" } }
    });

    expect(fromLambda).toEqual(fromNode);
    expect(fromNode.request.query).toEqual({
      bbox: "49,-124,50,-122",
      minRent: "1000,2000",
      bedrooms: "0"
    });
  });

  test("keeps dot segments that URL.pathname would resolve", () => {
    const raw = "/properties/%2e%2e/health";
    expect(apiRequestFromNode("GET", raw)).toEqual(
      apiRequestFromHttpApi({
        rawPath: raw,
        requestContext: { http: { method: "GET" } }
      })
    );
    expect(apiRequestFromNode("GET", "/properties/../health")).toEqual({
      ok: true,
      request: { method: "GET", path: "/properties/../health", query: {} }
    });
    expect(apiRequestFromNode("GET", "/properties/./abc")).toEqual({
      ok: true,
      request: { method: "GET", path: "/properties/./abc", query: {} }
    });
  });

  test("rejects a target the WHATWG parser would rewrite, on both doors", () => {
    const rejected = { ok: false, reason: "invalid-request-target" } as const;
    expect(apiRequestFromNode("GET", "//properties")).toEqual(rejected);
    expect(apiRequestFromHttpApi({ rawPath: "//properties" })).toEqual(rejected);
    expect(apiRequestFromNode("GET", "http://evil.example/health")).toEqual(rejected);
    expect(apiRequestFromHttpApi({ rawPath: "http://evil.example/health" })).toEqual(rejected);
  });

  test("passes the method through unchanged, including a lowercase token", () => {
    expect(apiRequestFromNode("get", "/health")).toEqual(
      apiRequestFromHttpApi({
        rawPath: "/health",
        requestContext: { http: { method: "get" } }
      })
    );
  });
});

describe("local request target through the shared pipeline", () => {
  test("GET /health is the health body", async () => {
    const res = await handleNodeRequest("GET", "/health");

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
    expect(res.headers["Access-Control-Allow-Origin"]).toBe("*");
  });

  test("a dot-segment path is not served as /health", async () => {
    // URL.pathname resolves both of these to /health. The router must see the
    // raw path and 404, which is what rawPath does on the Lambda.
    const parent = await handleNodeRequest("GET", "/properties/../health");
    const encoded = await handleNodeRequest("GET", "/properties/%2e%2e/health");

    expect(parent.statusCode).toBe(404);
    expect(JSON.parse(parent.body)).toEqual({ error: "Not found" });
    expect(encoded.statusCode).toBe(404);
    expect(JSON.parse(encoded.body)).toEqual({ error: "Not found" });
  });

  test("a scheme-relative target is a 400 envelope, not a rewritten path", async () => {
    const res = await handleNodeRequest("GET", "//properties");

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: "Invalid request target" });
    expect(Object.keys(JSON.parse(res.body))).toEqual(["error"]);
    expect(res.headers["Content-Type"]).toBe("application/json");
  });

  test("an absolute-form target is a 400, not GET /health", async () => {
    const res = await handleNodeRequest("GET", "http://evil.example/health");

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: "Invalid request target" });
  });

  test("repeated minRent is rejected before a query, with the shared envelope", async () => {
    const res = await handleNodeRequest(
      "GET",
      "/properties?bbox=49,-124,50,-122&minRent=1000&minRent=2000&bedrooms=0"
    );

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: "minRent must be a finite number" });
  });

  test("a lowercase method is not treated as GET", async () => {
    const res = await handleNodeRequest("get", "/health");

    expect(res.statusCode).toBe(405);
    expect(JSON.parse(res.body)).toEqual({ error: "Method not allowed" });
  });
});
