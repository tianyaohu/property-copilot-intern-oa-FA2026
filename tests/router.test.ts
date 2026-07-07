import { beforeEach, describe, expect, test, vi } from "vitest";
import { route } from "../backend/src/router";
import { MAX_RESULTS, ViewportTooLargeError } from "../backend/src/properties";
import type { Property } from "../backend/src/types";
import { makeProperty as property } from "./fixtures";

// Mock only the DynamoDB-backed functions; everything else (parseBoundingBox,
// parseFilter, filterProperties, ViewportTooLargeError) runs for real, so these
// tests exercise the router's actual branching and composition logic without a
// database. The full stack against DynamoDB Local is covered by
// properties.integration.test.ts.
vi.mock("../backend/src/properties", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../backend/src/properties")>();
  return {
    ...actual,
    getPropertyById: vi.fn(),
    queryByBoundingBox: vi.fn()
  };
});

const { getPropertyById, queryByBoundingBox } = vi.mocked(
  await import("../backend/src/properties")
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("route: method and path handling", () => {
  test("non-GET methods get 405", async () => {
    const res = await route({ method: "POST", path: "/properties", query: {} });
    expect(res.statusCode).toBe(405);
  });

  test("/health returns ok", async () => {
    const res = await route({ method: "GET", path: "/health", query: {} });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  test("unknown paths get 404", async () => {
    const res = await route({ method: "GET", path: "/nope", query: {} });
    expect(res.statusCode).toBe(404);
  });
});

describe("route: GET /properties", () => {
  test("missing bbox is rejected before any query runs", async () => {
    const res = await route({ method: "GET", path: "/properties", query: {} });
    expect(res.statusCode).toBe(400);
    expect(queryByBoundingBox).not.toHaveBeenCalled();
  });

  test("malformed bbox is rejected before any query runs", async () => {
    const res = await route({
      method: "GET",
      path: "/properties",
      query: { bbox: "not,a,real,box" }
    });
    expect(res.statusCode).toBe(400);
    expect(queryByBoundingBox).not.toHaveBeenCalled();
  });

  test("negative minRent is rejected before any query runs", async () => {
    const res = await route({
      method: "GET",
      path: "/properties",
      query: { bbox: "49,-124,50,-122", minRent: "-100" }
    });
    expect(res.statusCode).toBe(400);
    expect(queryByBoundingBox).not.toHaveBeenCalled();
  });

  test("minRent greater than maxRent is rejected before any query runs", async () => {
    const res = await route({
      method: "GET",
      path: "/properties",
      query: { bbox: "49,-124,50,-122", minRent: "3000", maxRent: "2000" }
    });
    expect(res.statusCode).toBe(400);
    expect(queryByBoundingBox).not.toHaveBeenCalled();
  });

  test("attribute filters compose on the geo result", async () => {
    queryByBoundingBox.mockResolvedValue([
      property({ id: "cheap", rent: 1500 }),
      property({ id: "pricey", rent: 3500 })
    ]);

    const res = await route({
      method: "GET",
      path: "/properties",
      query: { bbox: "49,-124,50,-122", minRent: "2000" }
    });

    expect(res.statusCode).toBe(200);
    const body = res.body as { properties: Property[]; count: number; truncated: boolean };
    expect(body.properties.map((p) => p.id)).toEqual(["pricey"]);
    expect(body.count).toBe(1);
    expect(body.truncated).toBe(false);
  });

  test("the result cap applies after attribute filters, so filters never lose matches to it", async () => {
    // 250 in-view listings, of which 210 satisfy the filter. Capping before
    // filtering would inspect only the first MAX_RESULTS raw matches; capping
    // after (the intended semantics) yields a full 200 + truncated.
    const inView = [
      ...Array.from({ length: 40 }, (_, i) => property({ id: `cheap-${i}`, rent: 1000 })),
      ...Array.from({ length: 210 }, (_, i) => property({ id: `match-${i}`, rent: 3000 }))
    ];
    queryByBoundingBox.mockResolvedValue(inView);

    const res = await route({
      method: "GET",
      path: "/properties",
      query: { bbox: "49,-124,50,-122", minRent: "2000" }
    });

    const body = res.body as { properties: Property[]; count: number; truncated: boolean };
    expect(body.count).toBe(MAX_RESULTS);
    expect(body.truncated).toBe(true);
    expect(body.properties.every((p) => p.rent >= 2000)).toBe(true);
  });

  test("a filtered result under the cap is not marked truncated", async () => {
    queryByBoundingBox.mockResolvedValue(
      Array.from({ length: 250 }, (_, i) =>
        property({ id: `p-${i}`, rent: i < 240 ? 1000 : 3000 })
      )
    );

    const res = await route({
      method: "GET",
      path: "/properties",
      query: { bbox: "49,-124,50,-122", minRent: "2000" }
    });

    const body = res.body as { properties: Property[]; count: number; truncated: boolean };
    expect(body.count).toBe(10);
    expect(body.truncated).toBe(false);
  });

  test("ViewportTooLargeError maps to a 400 telling the client to zoom in", async () => {
    queryByBoundingBox.mockRejectedValue(new ViewportTooLargeError(33_000_000));

    const res = await route({
      method: "GET",
      path: "/properties",
      query: { bbox: "-90,-180,90,180" }
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Viewport too large; zoom in" });
  });

  test("unexpected errors propagate (the HTTP adapters own the 500)", async () => {
    queryByBoundingBox.mockRejectedValue(new Error("dynamo down"));

    await expect(
      route({ method: "GET", path: "/properties", query: { bbox: "49,-124,50,-122" } })
    ).rejects.toThrow("dynamo down");
  });
});

describe("route: GET /properties/:id", () => {
  test("found listing returns 200 with the property", async () => {
    const found = property({ id: "abc-123" });
    getPropertyById.mockResolvedValue(found);

    const res = await route({ method: "GET", path: "/properties/abc-123", query: {} });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ property: found });
    expect(getPropertyById).toHaveBeenCalledWith("abc-123");
  });

  test("missing listing returns 404", async () => {
    getPropertyById.mockResolvedValue(null);

    const res = await route({ method: "GET", path: "/properties/nope", query: {} });

    expect(res.statusCode).toBe(404);
  });

  test("the id path segment is URL-decoded", async () => {
    getPropertyById.mockResolvedValue(null);

    await route({ method: "GET", path: "/properties/a%20b", query: {} });

    expect(getPropertyById).toHaveBeenCalledWith("a b");
  });
});
