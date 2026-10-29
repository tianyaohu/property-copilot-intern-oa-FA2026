import { beforeEach, describe, expect, test, vi } from "vitest";
import { ViewportTooLargeError } from "../backend/src/properties";
import { MAX_RESULTS, capResults, searchProperties } from "../backend/src/search";
import { makeProperty as property } from "./fixtures";

// searchProperties is the repository boundary: geo query in, filtered and
// capped listings out. Mock only the DynamoDB read. Filter predicates,
// including studio-as-exact, run for real.
vi.mock("../backend/src/properties", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../backend/src/properties")>();
  return {
    ...actual,
    queryByBoundingBox: vi.fn()
  };
});

const { queryByBoundingBox } = vi.mocked(await import("../backend/src/properties"));

const BOX = { minLat: 49, minLng: -124, maxLat: 50, maxLng: -122 };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("capResults", () => {
  test("a result set at the cap is returned whole", () => {
    const items = Array.from({ length: MAX_RESULTS }, (_, i) => property({ id: `p-${i}` }));
    expect(capResults(items)).toEqual({ properties: items, truncated: false });
  });

  test("one past the cap is clipped and marked truncated", () => {
    const items = Array.from({ length: MAX_RESULTS + 1 }, (_, i) => property({ id: `p-${i}` }));
    const capped = capResults(items);
    expect(capped.truncated).toBe(true);
    expect(capped.properties).toHaveLength(MAX_RESULTS);
    expect(capped.properties[0]?.id).toBe("p-0");
  });
});

describe("searchProperties", () => {
  test("queries the box and applies attribute filters to that result", async () => {
    queryByBoundingBox.mockResolvedValue([
      property({ id: "cheap", rent: 1500 }),
      property({ id: "pricey", rent: 3500 })
    ]);

    const result = await searchProperties(BOX, { minRent: 2000 });

    expect(queryByBoundingBox).toHaveBeenCalledWith(BOX);
    expect(result.properties.map((item) => item.id)).toEqual(["pricey"]);
    expect(result.truncated).toBe(false);
  });

  test("bedrooms 0 stays an exact studio match", async () => {
    queryByBoundingBox.mockResolvedValue([
      property({ id: "studio", bedrooms: 0 }),
      property({ id: "one-bed", bedrooms: 1 })
    ]);

    const result = await searchProperties(BOX, { bedrooms: 0 });

    expect(result.properties.map((item) => item.id)).toEqual(["studio"]);
  });

  test("the cap runs after filters, so a narrow filter does not lose matches to it", async () => {
    const inView = [
      ...Array.from({ length: 40 }, (_, i) => property({ id: `cheap-${i}`, rent: 1000 })),
      ...Array.from({ length: MAX_RESULTS + 10 }, (_, i) => property({ id: `match-${i}`, rent: 3000 }))
    ];
    queryByBoundingBox.mockResolvedValue(inView);

    const result = await searchProperties(BOX, { minRent: 2000 });

    expect(result.properties).toHaveLength(MAX_RESULTS);
    expect(result.truncated).toBe(true);
    expect(result.properties.every((item) => item.rent >= 2000)).toBe(true);
  });

  test("a filtered result under the cap is not marked truncated", async () => {
    queryByBoundingBox.mockResolvedValue(
      Array.from({ length: 250 }, (_, i) => property({ id: `p-${i}`, rent: i < 240 ? 1000 : 3000 }))
    );

    const result = await searchProperties(BOX, { minRent: 2000 });

    expect(result.properties).toHaveLength(10);
    expect(result.truncated).toBe(false);
  });

  test("ViewportTooLargeError propagates for the HTTP layer to map", async () => {
    queryByBoundingBox.mockRejectedValue(new ViewportTooLargeError(33_000_000));

    await expect(searchProperties(BOX, {})).rejects.toThrow(ViewportTooLargeError);
  });

  test("unexpected repository errors propagate", async () => {
    queryByBoundingBox.mockRejectedValue(new Error("dynamo down"));

    await expect(searchProperties(BOX, {})).rejects.toThrow("dynamo down");
  });
});
