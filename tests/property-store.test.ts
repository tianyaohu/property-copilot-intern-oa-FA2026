import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryByBoundingBox } from "../backend/src/properties";
import {
  continuation,
  createDynamoPropertyStore,
  createPropertyStore,
  readPartition,
  type PropertyTable
} from "../backend/src/property-store";
import { makeProperty } from "./fixtures";

const send = vi.hoisted(() => vi.fn());

vi.mock("../backend/src/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../backend/src/db")>();
  return {
    ...actual,
    getDocClient: () => ({ send })
  };
});

const ORIGINAL_TABLE = process.env.PROPERTIES_TABLE;

function tableStub(queryPage: PropertyTable["queryPage"]): PropertyTable {
  return {
    getById: async () => null,
    put: async () => {},
    queryPage
  };
}

beforeEach(() => {
  send.mockReset();
});

afterEach(() => {
  if (ORIGINAL_TABLE === undefined) delete process.env.PROPERTIES_TABLE;
  else process.env.PROPERTIES_TABLE = ORIGINAL_TABLE;
});

describe("partition pagination", () => {
  it("treats a missing or empty cursor as the end of the partition", () => {
    expect(continuation(undefined)).toBeUndefined();
    expect(continuation({})).toBeUndefined();
    const key = { id: "a", geohashPrefix: "c2b2q" };
    expect(continuation(key)).toBe(key);
  });

  it("passes the previous cursor to the next page and stops when the cursor is absent", async () => {
    const cursor = { id: "a", geohashPrefix: "c2b2q", geohash: "c2b2qeb" };
    const first = makeProperty({ id: "a" });
    const second = makeProperty({ id: "b" });
    const seen: Array<typeof cursor | undefined> = [];
    let page = 0;
    const table = tableStub(async (_prefix, start) => {
      seen.push(start as typeof cursor | undefined);
      page += 1;
      if (page > 2) throw new Error("pagination did not stop");
      if (page === 1) return { items: [first], cursor };
      return { items: [second] };
    });

    await expect(readPartition(table, "c2b2q")).resolves.toEqual([first, second]);
    expect(seen).toEqual([undefined, cursor]);
  });

  it("stops when a page returns an empty cursor", async () => {
    let calls = 0;
    const only = makeProperty({ id: "only" });
    const table = tableStub(async () => {
      calls += 1;
      if (calls > 1) throw new Error("empty cursor must stop pagination");
      return { items: [only], cursor: {} };
    });

    await expect(readPartition(table, "c2b2q")).resolves.toEqual([only]);
    expect(calls).toBe(1);
  });

  it("exposes the same loop through createPropertyStore", async () => {
    const item = makeProperty({ id: "stored" });
    const store = createPropertyStore(
      tableStub(async () => ({ items: [item] }))
    );

    await expect(store.readPartition("c2b2q")).resolves.toEqual([item]);
  });
});

describe("DynamoDB property store", () => {
  const store = createDynamoPropertyStore();

  it("gets one item by id and returns null when the row is missing", async () => {
    const item = makeProperty({ id: "listing-1" });
    send.mockResolvedValueOnce({ Item: item });

    await expect(store.getById("listing-1")).resolves.toEqual(item);

    const command = send.mock.calls[0][0];
    expect(command).toBeInstanceOf(GetCommand);
    expect(command.input).toMatchObject({
      TableName: "Properties-test",
      Key: { id: "listing-1" }
    });

    send.mockResolvedValueOnce({});
    await expect(store.getById("missing")).resolves.toBeNull();
  });

  it("puts the item it is given, without deriving geo keys", async () => {
    const item = makeProperty({ geohash: "as-given", geohashPrefix: "as-gi" });
    send.mockResolvedValueOnce({});

    await store.put(item);

    const command = send.mock.calls[0][0];
    expect(command).toBeInstanceOf(PutCommand);
    expect(command.input.Item).toBe(item);
    expect(command.input.TableName).toBe("Properties-test");
  });

  it("queries geo-index one page at a time and chains LastEvaluatedKey", async () => {
    const cursor = { id: "p1", geohashPrefix: "c2b2q", geohash: "c2b2qeb" };
    const first = makeProperty({ id: "p1" });
    const second = makeProperty({ id: "p2" });
    send
      .mockResolvedValueOnce({ Items: [first], LastEvaluatedKey: cursor })
      .mockResolvedValueOnce({ Items: [second] });

    await expect(store.readPartition("c2b2q")).resolves.toEqual([first, second]);

    const queries = send.mock.calls.map((call) => call[0]);
    expect(queries).toHaveLength(2);
    expect(queries[0]).toBeInstanceOf(QueryCommand);
    expect(queries[1]).toBeInstanceOf(QueryCommand);
    expect(queries[0].input).toMatchObject({
      TableName: "Properties-test",
      IndexName: "geo-index",
      KeyConditionExpression: "geohashPrefix = :p",
      ExpressionAttributeValues: { ":p": "c2b2q" }
    });
    expect(queries[0].input.ExclusiveStartKey).toBeUndefined();
    expect(queries[1].input.ExclusiveStartKey).toEqual(cursor);
  });

  it("does not issue another Query when LastEvaluatedKey is empty", async () => {
    send.mockResolvedValue({ Items: [makeProperty()], LastEvaluatedKey: {} });

    await expect(store.readPartition("c2b2q")).resolves.toHaveLength(1);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("reads PROPERTIES_TABLE when the command is sent", async () => {
    process.env.PROPERTIES_TABLE = "Renamed-table";
    send.mockResolvedValueOnce({});

    await store.getById("listing-1");

    expect(send.mock.calls[0][0].input.TableName).toBe("Renamed-table");
  });

  it("queryByBoundingBox follows LastEvaluatedKey on the default store", async () => {
    // Same call search.ts makes: no store argument. One prefix, two pages.
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const cursor = { id: "p1", geohashPrefix: "c2b2q", geohash: "c2b2qeb" };
    const first = makeProperty({ id: "p1", lat: 49.282, lng: -123.118 });
    const second = makeProperty({ id: "p2", lat: 49.285, lng: -123.115 });
    send
      .mockResolvedValueOnce({ Items: [first], LastEvaluatedKey: cursor })
      .mockResolvedValueOnce({ Items: [second] });

    const matches = await queryByBoundingBox({
      minLat: 49.28,
      minLng: -123.12,
      maxLat: 49.29,
      maxLng: -123.11
    });

    expect(matches.map((item) => item.id)).toEqual(["p1", "p2"]);
    const queries = send.mock.calls.map((call) => call[0]);
    expect(queries).toHaveLength(2);
    expect(queries[1].input.ExclusiveStartKey).toEqual(cursor);
    log.mockRestore();
  });
});
