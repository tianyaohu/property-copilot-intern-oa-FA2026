import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  boundingBoxPrefixes,
  encodeGeohash,
  geohashPrefix,
  type BoundingBox
} from "../backend/src/geo";
import {
  ViewportTooLargeError,
  getPropertyById,
  putProperty,
  queryByBoundingBox
} from "../backend/src/properties";
import type { PropertyStore } from "../backend/src/property-store";
import type { Property } from "../backend/src/types";
import { makeProperty } from "./fixtures";

// Downtown Vancouver. Several prefix cells, and (49.28, -123.12) sits inside.
const BOX: BoundingBox = {
  minLat: 49.26,
  minLng: -123.14,
  maxLat: 49.3,
  maxLng: -123.1
};

const WORLD: BoundingBox = { minLat: -89, minLng: -179, maxLat: 89, maxLng: 179 };

function fakeStore(readPartition: PropertyStore["readPartition"]): PropertyStore & {
  puts: Property[];
} {
  const puts: Property[] = [];
  return {
    puts,
    getById: async (id) => (id === "present" ? makeProperty({ id }) : null),
    put: async (item) => {
      puts.push(item);
    },
    readPartition
  };
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("queryByBoundingBox against a PropertyStore", () => {
  it("reads every prefix, keeps the later duplicate, and drops points outside the box", async () => {
    const prefixes = boundingBoxPrefixes(BOX);
    expect(prefixes.length).toBeGreaterThan(1);
    const [first, second] = prefixes;

    const outside = makeProperty({ id: "dropped", lat: 49.19, lng: -122.85 });
    const firstCopy = makeProperty({
      id: "kept",
      lat: 49.28,
      lng: -123.12,
      title: "first partition"
    });
    const extra = makeProperty({ id: "extra", lat: 49.27, lng: -123.13 });
    const laterCopy = makeProperty({
      id: "kept",
      lat: 49.29,
      lng: -123.11,
      title: "second partition"
    });

    const byPrefix = new Map<string, Property[]>(prefixes.map((prefix) => [prefix, []]));
    byPrefix.set(first, [firstCopy, outside, extra]);
    byPrefix.set(second, [laterCopy]);

    const reads: string[] = [];
    const store = fakeStore(async (prefix) => {
      reads.push(prefix);
      return byPrefix.get(prefix) ?? [];
    });

    const matches = await queryByBoundingBox(BOX, store);

    // Map keeps the first key position and the last value for that id.
    expect(reads).toEqual(prefixes);
    expect(matches.map((item) => item.id)).toEqual(["kept", "extra"]);
    expect(matches[0]).toMatchObject({ title: "second partition" });
    expect(store.puts).toEqual([]);
  });

  it("rejects an oversized viewport before any partition is read", async () => {
    const readPartition = vi.fn(async () => []);
    const store = fakeStore(readPartition);

    await expect(queryByBoundingBox(WORLD, store)).rejects.toThrow(ViewportTooLargeError);
    expect(readPartition).not.toHaveBeenCalled();
  });

  it("propagates a partition failure instead of returning a partial viewport", async () => {
    const store = fakeStore(async () => {
      throw new Error("throughput");
    });

    await expect(queryByBoundingBox(BOX, store)).rejects.toThrow("throughput");
  });
});

describe("listing identity against a PropertyStore", () => {
  it("derives geo keys before put and does not trust keys on the input", async () => {
    const store = fakeStore(async () => []);
    const draft = makeProperty({
      id: "new",
      lat: 49.2827,
      lng: -123.1207,
      geohash: "wrong",
      geohashPrefix: "wrong"
    });

    const saved = await putProperty(draft, store);

    expect(saved.geohash).toBe(encodeGeohash(draft.lat, draft.lng));
    expect(saved.geohashPrefix).toBe(geohashPrefix(saved.geohash));
    expect(saved.geohash).not.toBe("wrong");
    expect(store.puts).toEqual([saved]);
  });

  it("returns the store row or null", async () => {
    const store = fakeStore(async () => []);

    await expect(getPropertyById("present", store)).resolves.toMatchObject({ id: "present" });
    await expect(getPropertyById("missing", store)).resolves.toBeNull();
  });
});
