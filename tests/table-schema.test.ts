import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { GEO_INDEX, tableName } from "../backend/src/db";
import propertiesTable from "../backend/src/properties-table.json";
import {
  DEFAULT_TABLE_NAME,
  GEO_INDEX_NAME,
  PROPERTIES_TABLE_SPEC,
  parsePropertiesTableSpec,
  propertiesTableCreateInput
} from "../backend/src/table-schema";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// The CreateTable shape local dev and the integration suite used to each
// write out. Locking it here is what keeps a provisioning edit from landing
// in only one of them.
const EXPECTED_KEYS = {
  BillingMode: "PAY_PER_REQUEST",
  AttributeDefinitions: [
    { AttributeName: "id", AttributeType: "S" },
    { AttributeName: "geohashPrefix", AttributeType: "S" },
    { AttributeName: "geohash", AttributeType: "S" }
  ],
  KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
  GlobalSecondaryIndexes: [
    {
      IndexName: "geo-index",
      KeySchema: [
        { AttributeName: "geohashPrefix", KeyType: "HASH" },
        { AttributeName: "geohash", KeyType: "RANGE" }
      ],
      Projection: { ProjectionType: "ALL" }
    }
  ]
};

describe("properties table schema", () => {
  const originalTable = process.env.PROPERTIES_TABLE;

  afterEach(() => {
    if (originalTable === undefined) delete process.env.PROPERTIES_TABLE;
    else process.env.PROPERTIES_TABLE = originalTable;
  });

  it("builds the CreateTable input shared by local dev and the integration suite", () => {
    expect(propertiesTableCreateInput("Properties-test")).toEqual({
      TableName: "Properties-test",
      ...EXPECTED_KEYS
    });
  });

  it("changes only the table name when the caller passes a different one", () => {
    const local = propertiesTableCreateInput("Properties");
    const tests = propertiesTableCreateInput("Properties-test");
    expect(local.TableName).toBe("Properties");
    expect(tests.TableName).toBe("Properties-test");
    expect({ ...local, TableName: tests.TableName }).toEqual(tests);
  });

  it("declares an attribute for every key and no attribute that is not a key", () => {
    const declared = PROPERTIES_TABLE_SPEC.attributes.map((attribute) => ({
      name: attribute.name,
      type: attribute.type
    }));
    const keys = [
      PROPERTIES_TABLE_SPEC.partitionKey,
      ...PROPERTIES_TABLE_SPEC.globalSecondaryIndexes.flatMap((index) => [
        index.partitionKey,
        index.sortKey
      ])
    ];
    expect(declared).toEqual(keys);
  });

  it("uses the same geo index name the query path sends", () => {
    expect(GEO_INDEX_NAME).toBe("geo-index");
    expect(GEO_INDEX).toBe(GEO_INDEX_NAME);
    const input = propertiesTableCreateInput(DEFAULT_TABLE_NAME);
    expect(input.GlobalSecondaryIndexes.map((index) => index.IndexName)).toEqual([GEO_INDEX]);
  });

  it("falls back to the provisioned table name when PROPERTIES_TABLE is unset", () => {
    delete process.env.PROPERTIES_TABLE;
    expect(DEFAULT_TABLE_NAME).toBe("Properties");
    expect(tableName()).toBe(DEFAULT_TABLE_NAME);
  });

  it("rejects a spec whose attributes are not exactly its keys", () => {
    expect(() =>
      parsePropertiesTableSpec({
        ...propertiesTable,
        attributes: [{ name: "id", type: "S" }]
      })
    ).toThrow(/attributes must list every key/);
  });

  it("keeps provisioning on the JSON spec instead of a second literal schema", () => {
    const stack = readFileSync(join(ROOT, "infra/lib/properties-stack.ts"), "utf8");
    const script = readFileSync(join(ROOT, "backend/scripts/create-local-table.ts"), "utf8");
    const door = readFileSync(join(ROOT, "backend/src/table-schema.ts"), "utf8");

    expect(stack).toContain("properties-table.json");
    expect(stack).not.toMatch(/from ["'][^"']*table-schema["']/);
    expect(door).toContain("properties-table.json");
    expect(script).toContain("propertiesTableCreateInput");
    expect(PROPERTIES_TABLE_SPEC.defaultTableName).toBe(propertiesTable.defaultTableName);

    for (const source of [stack, script, door]) {
      expect(source).not.toContain('"geo-index"');
      expect(source).not.toContain('"geohashPrefix"');
      expect(source).not.toContain('"geohash"');
      expect(source).not.toMatch(/AttributeName:\s*"/);
    }
  });
});
