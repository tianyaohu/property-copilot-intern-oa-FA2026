import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.hoisted(() => vi.fn());

// Keep the real table-name binding. Only the DynamoDB client is stubbed, so
// the command's TableName is whatever the data layer actually puts on the wire.
vi.mock("../backend/src/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../backend/src/db")>();
  return {
    ...actual,
    getDocClient: () => ({ send })
  };
});

import { getPropertyById, queryByBoundingBox } from "../backend/src/properties";

const ORIGINAL = process.env.PROPERTIES_TABLE;

beforeEach(() => {
  send.mockReset();
  send.mockResolvedValue({ Items: [] });
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.PROPERTIES_TABLE;
  else process.env.PROPERTIES_TABLE = ORIGINAL;
});

describe("properties table name", () => {
  it("uses PROPERTIES_TABLE from the environment when the request is built", async () => {
    // seed.ts and the local server call loadEnvConfig after this module has
    // already been imported. A name captured at import time still points at
    // the default table, so the read comes back empty and truncated: false.
    process.env.PROPERTIES_TABLE = "Renamed-table";

    await getPropertyById("listing-1");
    await queryByBoundingBox({
      minLat: 49.28,
      minLng: -123.12,
      maxLat: 49.29,
      maxLng: -123.11
    });

    expect(send.mock.calls.length).toBeGreaterThan(0);
    for (const call of send.mock.calls) {
      expect(call[0].input.TableName).toBe("Renamed-table");
    }
  });
});
