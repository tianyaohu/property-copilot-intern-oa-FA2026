import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient
} from "@aws-sdk/client-dynamodb";
import { beforeAll, describe, expect, it } from "vitest";
import { putProperty } from "../backend/src/properties";
import { route } from "../backend/src/router";
import type { Property } from "../backend/src/types";

// Integration tests for the /properties viewport query, run against DynamoDB
// Local (docker compose up -d, or the CI service container). They exercise the
// full path — bbox parse → geo-index GSI Query fan-out → dedupe → exact-box
// refine → attribute filters — against a real DynamoDB engine. When
// DYNAMODB_ENDPOINT is unset the whole suite skips, so plain `npm test` stays
// green without Docker.
const ENDPOINT = process.env.DYNAMODB_ENDPOINT;

// tests/setup.ts pins this to "Properties-test" before modules load, so the
// data layer (db.ts TABLE_NAME) and this admin client agree.
const TABLE_NAME = process.env.PROPERTIES_TABLE ?? "Properties-test";

const admin = new DynamoDBClient({
  region: process.env.AWS_REGION ?? "us-west-2",
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "local",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "local"
  }
});

// Mirrors the schema in backend/scripts/create-local-table.ts / infra. Inlined
// because that script executes on import.
const TABLE_SCHEMA = {
  TableName: TABLE_NAME,
  BillingMode: "PAY_PER_REQUEST" as const,
  AttributeDefinitions: [
    { AttributeName: "id", AttributeType: "S" as const },
    { AttributeName: "geohashPrefix", AttributeType: "S" as const },
    { AttributeName: "geohash", AttributeType: "S" as const }
  ],
  KeySchema: [{ AttributeName: "id", KeyType: "HASH" as const }],
  GlobalSecondaryIndexes: [
    {
      IndexName: "geo-index",
      KeySchema: [
        { AttributeName: "geohashPrefix", KeyType: "HASH" as const },
        { AttributeName: "geohash", KeyType: "RANGE" as const }
      ],
      Projection: { ProjectionType: "ALL" as const }
    }
  ]
};

type SeedListing = Omit<Property, "geohash" | "geohashPrefix">;

function listing(
  id: string,
  overrides: Pick<Property, "lat" | "lng" | "rent" | "bedrooms" | "bathrooms" | "city"> &
    Partial<SeedListing>
): SeedListing {
  return {
    id,
    title: `Test listing ${id}`,
    description: "Integration test fixture",
    propertyType: "apartment",
    squareFeet: 700,
    street: "123 Test St",
    province: "BC",
    postalCode: "V6B 1A1",
    images: Array.from({ length: 5 }, (_, i) => `https://example.com/${id}/${i}.jpg`),
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

// Known coordinates: two inside DOWNTOWN_BBOX, Kitsilano just west of its
// minLng edge (close enough to share/abut geohash cells — exercises the
// exact-box refine), Richmond and Surrey well outside.
const FIXTURES: SeedListing[] = [
  listing("dt-cheap", { lat: 49.282, lng: -123.12, rent: 2400, bedrooms: 1, bathrooms: 1, city: "Vancouver" }),
  listing("dt-pricey", { lat: 49.287, lng: -123.115, rent: 3200, bedrooms: 2, bathrooms: 2, city: "Vancouver" }),
  listing("kits", { lat: 49.268, lng: -123.155, rent: 2800, bedrooms: 2, bathrooms: 1, city: "Vancouver" }),
  listing("richmond", { lat: 49.163, lng: -123.137, rent: 2100, bedrooms: 2, bathrooms: 2, city: "Richmond" }),
  listing("surrey", { lat: 49.19, lng: -122.85, rent: 1900, bedrooms: 3, bathrooms: 2, city: "Surrey", propertyType: "house" })
];

const DOWNTOWN_BBOX = "49.26,-123.14,49.30,-123.10";
const METRO_BBOX = "49.0,-123.35,49.45,-122.6";

async function getProperties(query: Record<string, string | undefined>) {
  const res = await route({ method: "GET", path: "/properties", query });
  return {
    ...res,
    body: res.body as {
      properties?: Property[];
      count?: number;
      truncated?: boolean;
      error?: string;
    }
  };
}

function ids(properties: Property[] | undefined): string[] {
  return (properties ?? []).map((p) => p.id).sort();
}

describe.runIf(!!ENDPOINT)("GET /properties (integration, DynamoDB Local)", () => {
  beforeAll(async () => {
    // Fresh table every run so assertions on exact id sets are deterministic.
    try {
      await admin.send(new DeleteTableCommand({ TableName: TABLE_NAME }));
    } catch {
      // Table did not exist yet.
    }
    await admin.send(new CreateTableCommand(TABLE_SCHEMA));
    for (const fixture of FIXTURES) {
      await putProperty(fixture);
    }
  }, 30_000);

  it("answers a viewport query with exactly the in-box listings", async () => {
    const res = await getProperties({ bbox: DOWNTOWN_BBOX });
    expect(res.statusCode).toBe(200);
    expect(ids(res.body.properties)).toEqual(["dt-cheap", "dt-pricey"]);
    expect(res.body.count).toBe(2);
    expect(res.body.truncated).toBe(false);
  });

  it("excludes a listing outside the box even when its geohash cell overlaps", async () => {
    // kits (lng -123.155) is west of the box's minLng but geographically close;
    // only the exact-box refine step keeps it out of the response.
    const res = await getProperties({ bbox: DOWNTOWN_BBOX });
    expect(ids(res.body.properties)).not.toContain("kits");
  });

  it("composes attribute filters with the viewport query", async () => {
    const res = await getProperties({ bbox: METRO_BBOX, minRent: "2000", bedrooms: "2" });
    expect(res.statusCode).toBe(200);
    // surrey (rent 1900) fails minRent; dt-cheap (1 bd) fails bedrooms.
    expect(ids(res.body.properties)).toEqual(["dt-pricey", "kits", "richmond"]);
  });

  it("filters by a comma-separated property-type list", async () => {
    // Only surrey is a house; the rest are apartments.
    const houses = await getProperties({ bbox: METRO_BBOX, propertyType: "house" });
    expect(ids(houses.body.properties)).toEqual(["surrey"]);

    // apartment,house is the union — every fixture qualifies.
    const both = await getProperties({ bbox: METRO_BBOX, propertyType: "apartment,house" });
    expect(both.body.count).toBe(FIXTURES.length);
  });

  it("returns everything in a metro-wide box, unclipped by the result cap", async () => {
    const res = await getProperties({ bbox: METRO_BBOX });
    expect(res.body.count).toBe(FIXTURES.length);
    expect(res.body.truncated).toBe(false);
  });

  it("rejects a missing bbox", async () => {
    const res = await getProperties({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/bbox is required/i);
  });

  it("rejects a malformed bbox", async () => {
    const res = await getProperties({ bbox: "not,a,real,box" });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalid bbox/i);
  });

  it("serves a listing by id", async () => {
    const res = await route({ method: "GET", path: "/properties/dt-cheap", query: {} });
    expect(res.statusCode).toBe(200);
    expect((res.body as { property: Property }).property).toMatchObject({
      id: "dt-cheap",
      rent: 2400,
      city: "Vancouver"
    });
  });

  it("404s for an unknown listing id", async () => {
    const res = await route({ method: "GET", path: "/properties/no-such-id", query: {} });
    expect(res.statusCode).toBe(404);
  });
});
