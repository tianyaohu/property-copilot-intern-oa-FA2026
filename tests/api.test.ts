import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchProperty } from "../lib/api";
import { makeProperty } from "./fixtures";

// GET /properties/:id is a different envelope from the list (`{ property }`,
// not `{ properties, count, truncated }`). The detail client has to request
// the id on one path segment the router can decode, and it has to refuse a
// list body instead of fulfilling with `undefined`.
const BASE = "http://localhost:4000";

function httpResult(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body)
  } as Response;
}

/** The same decode the detail route applies to the single id segment. */
function idFromDetailUrl(url: string): string {
  const match = new URL(url).pathname.match(/^\/properties\/([^/]+)$/);
  if (!match) {
    throw new Error(`not a detail path: ${new URL(url).pathname}`);
  }
  return decodeURIComponent(match[1]);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchProperty", () => {
  it("requests an id the detail route can decode, including slash, percent, and question mark", async () => {
    const id = "suite/4 100%?wing";
    const listing = makeProperty({ id });
    const fetchMock = vi.fn().mockResolvedValue(httpResult(200, { property: listing }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchProperty(id)).resolves.toMatchObject({ id });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url.startsWith(`${BASE}/properties/`)).toBe(true);
    expect(idFromDetailUrl(url)).toBe(id);
    // The query string belongs to the id, not to a search on a shorter path.
    expect(new URL(url).search).toBe("");
  });

  it("rejects a list envelope instead of fulfilling with undefined", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        httpResult(200, { properties: [makeProperty()], count: 1, truncated: false })
      )
    );

    await expect(fetchProperty("prop-001")).rejects.toThrow(/listing/i);
  });

  it("rejects a 200 body that is not a detail envelope", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(httpResult(200, null)));

    await expect(fetchProperty("prop-001")).rejects.toThrow(/listing/i);
  });

  it("surfaces the server's 404 instead of a missing envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(httpResult(404, { error: "Property not found" }))
    );

    await expect(fetchProperty("missing")).rejects.toThrow("Property not found");
  });

  it("still returns the property from a detail envelope", async () => {
    const listing = makeProperty({ id: "prop-001", rent: 2400 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(httpResult(200, { property: listing })));

    await expect(fetchProperty("prop-001")).resolves.toEqual(listing);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe(`${BASE}/properties/prop-001`);
  });
});
