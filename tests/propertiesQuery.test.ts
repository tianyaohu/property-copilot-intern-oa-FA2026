import { afterEach, describe, expect, it, vi } from "vitest";
import { serializeFilter } from "../backend/src/filter";
import type { PropertyFilter } from "../lib/types";
import { makeProperty } from "./fixtures";

// Pins the client properties boundary: filter + viewport → /properties path,
// no request when the viewport or signal is already gone, and a typed result
// instead of a thrown error for the browse page to switch on.
import { buildPropertiesQuery, loadProperties } from "../lib/propertiesQuery";

const BBOX = "49.2,-123.2,49.3,-123.1";
const BASE = "http://localhost:4000";

function abortError(): Error {
  const err = new Error("The operation was aborted");
  err.name = "AbortError";
  return err;
}

function httpResult(
  status: number,
  body: unknown,
  options?: { jsonError?: unknown }
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => (options?.jsonError ? Promise.reject(options.jsonError) : Promise.resolve(body))
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("buildPropertiesQuery", () => {
  it("returns null when the viewport is missing and does not encode filters alone", () => {
    const filter: PropertyFilter = { minRent: 2000, bedrooms: 2 };
    expect(buildPropertiesQuery(filter, null)).toBeNull();
    expect(buildPropertiesQuery(filter, undefined)).toBeNull();
    expect(buildPropertiesQuery({}, undefined)).toBeNull();
  });

  it("passes a bbox string through unchanged, including one that crosses the antimeridian", () => {
    const crossing = "49,170,50,-170";
    const path = buildPropertiesQuery({}, crossing);
    expect(path).not.toBeNull();
    expect(new URL(path!, BASE).searchParams.get("bbox")).toBe(crossing);
  });

  it("places bbox first and then the shared filter serializer, without inventing bedroom flags", () => {
    const filter: PropertyFilter = {
      minRent: 1500,
      maxRent: 3000,
      bedrooms: 0,
      bathrooms: 1,
      propertyTypes: ["apartment", "condo"]
    };
    const path = buildPropertiesQuery(filter, BBOX);
    const params = new URL(path!, BASE).searchParams;
    const serialized = serializeFilter(filter);

    expect(params.get("bbox")).toBe(BBOX);
    expect([...params.keys()]).toEqual(["bbox", ...serialized.keys()]);
    for (const [key, value] of serialized) {
      expect(params.get(key)).toBe(value);
    }
    // Studio (bedrooms: 0) stays a plain bedrooms param. Exactness is the
    // filter registry's flag, not something the query builder adds.
    expect(params.get("bedrooms")).toBe("0");
    expect(params.has("bedroomsExact")).toBe(false);
  });

  it("forwards bedroomsExact when the filter already has it", () => {
    const params = new URL(
      buildPropertiesQuery({ bedrooms: 0, bedroomsExact: true }, BBOX)!,
      BASE
    ).searchParams;
    expect(params.get("bedrooms")).toBe("0");
    expect(params.get("bedroomsExact")).toBe("true");
  });
});

describe("loadProperties", () => {
  it("does not fetch when the viewport is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadProperties({ filter: { minRent: 1000 }, bbox: null })).resolves.toEqual({
      status: "cancelled",
      reason: "missing-viewport"
    });
    await expect(loadProperties({ bbox: undefined })).resolves.toEqual({
      status: "cancelled",
      reason: "missing-viewport"
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not fetch when the signal is already aborted", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    controller.abort();

    await expect(loadProperties({ bbox: BBOX, signal: controller.signal })).resolves.toEqual({
      status: "aborted"
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("prefers a missing viewport over an already-aborted signal", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      loadProperties({ bbox: null, signal: controller.signal, filter: { bedrooms: 2 } })
    ).resolves.toEqual({ status: "cancelled", reason: "missing-viewport" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("GETs the built /properties query and normalizes a truncated payload", async () => {
    const listing = makeProperty({ id: "p-1" });
    const fetchMock = vi.fn().mockResolvedValue(
      httpResult(200, { properties: [listing], truncated: true, count: 1 })
    );
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    const filter: PropertyFilter = { minRent: 2000, propertyTypes: ["apartment"] };

    const result = await loadProperties({ filter, bbox: BBOX, signal: controller.signal });

    expect(result).toEqual({ status: "success", properties: [listing], truncated: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}${buildPropertiesQuery(filter, BBOX)}`);
    expect(fetchMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({ signal: controller.signal })
    );
  });

  it("treats a missing truncated flag as false and an empty list as success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(httpResult(200, { properties: [] }))
    );

    await expect(loadProperties({ bbox: BBOX })).resolves.toEqual({
      status: "success",
      properties: [],
      truncated: false
    });
  });

  it("returns the server error message on a non-2xx JSON body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(httpResult(400, { error: "Viewport too large; zoom in" }))
    );

    await expect(loadProperties({ bbox: BBOX })).resolves.toEqual({
      status: "error",
      message: "Viewport too large; zoom in"
    });
  });

  it("returns a status fallback when a non-2xx body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(httpResult(502, null, { jsonError: new Error("bad json") }))
    );

    await expect(loadProperties({ bbox: BBOX })).resolves.toEqual({
      status: "error",
      message: "Request failed (502)"
    });
  });

  it("returns an error when a 200 body is not a properties list", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(httpResult(200, null)));

    await expect(loadProperties({ bbox: BBOX })).resolves.toEqual({
      status: "error",
      message: "Failed to load listings"
    });
  });

  it("normalizes an abort during the request, including a body read, as aborted", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(abortError())
      .mockResolvedValueOnce(httpResult(200, { properties: [] }, { jsonError: abortError() }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadProperties({ bbox: BBOX })).resolves.toEqual({ status: "aborted" });
    await expect(loadProperties({ bbox: BBOX })).resolves.toEqual({ status: "aborted" });
  });

  it("does not deliver a payload resolved after the signal aborts", async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        controller.abort();
        return httpResult(200, { properties: [makeProperty()], truncated: false });
      })
    );

    await expect(loadProperties({ bbox: BBOX, signal: controller.signal })).resolves.toEqual({
      status: "aborted"
    });
  });

  it("surfaces a network failure message and never rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(loadProperties({ bbox: BBOX })).resolves.toEqual({
      status: "error",
      message: "Failed to fetch"
    });
  });
});
