import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseFilter,
  serializeFilter,
  validateFilterQuery
} from "../backend/src/filter";
import { buildPropertiesQuery } from "../lib/propertiesQuery";
import {
  FILTER_QUERY_NUMERIC_PARAMS,
  filterQuerySyntaxError,
  parseFilter as parseFilterQuery,
  serializeFilter as serializeFilterQuery
} from "../shared/filterQuery";
import type { PropertyFilter } from "../shared/contract";

// The listings query string had two owners: the Lambda filter registry
// serialized it, and the Next.js client imported that server module to do
// the same job. These tests pin the shared codec and the dependency
// direction. Match predicates stay on the server and are not asserted here.

const ROOT = join(import.meta.dirname, "..");
const CLIENT_ROOTS = ["app", "components", "lib"];

function sourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...sourceFiles(path));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(path);
    }
  }
  return files;
}

/** Import specifiers only. Comments may name the server tree without importing it. */
function importsBackend(source: string): boolean {
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const withoutLineComments = withoutBlockComments.replace(/^\s*\/\/.*$/gm, "");
  return /from\s*["'][^"']*backend\/|import\s*\(\s*["'][^"']*backend\//.test(withoutLineComments);
}

describe("shared filter query codec", () => {
  const cases: PropertyFilter[] = [
    {},
    { minRent: 1500 },
    { maxRent: 4000 },
    { minRent: 1500, maxRent: 4000 },
    { bedrooms: 0 },
    { bedrooms: 2 },
    { bedrooms: 2, bedroomsExact: true },
    { bedroomsExact: true },
    { bathrooms: 1 },
    { propertyTypes: ["condo"] },
    { propertyTypes: ["apartment", "townhouse"] },
    {
      minRent: 1000,
      maxRent: 3000,
      bedrooms: 1,
      bedroomsExact: true,
      bathrooms: 2,
      propertyTypes: ["house", "condo"]
    }
  ];

  it.each(cases)("reparses %o unchanged", (filter) => {
    const query = Object.fromEntries(serializeFilterQuery(filter));
    expect(parseFilterQuery(query)).toEqual(filter);
  });

  it("is the same function the API module re-exports", () => {
    // Identity, not a second copy kept in line by a deep-equal test. A
    // hand-rolled serializer in backend/src/filter.ts would still match
    // today's cases and could drift on the next field.
    expect(serializeFilter).toBe(serializeFilterQuery);
    expect(parseFilter).toBe(parseFilterQuery);
    expect(validateFilterQuery).toBe(filterQuerySyntaxError);
  });

  it("writes params in wire order, with bedrooms=0 and no invented bedroomsExact", () => {
    const params = serializeFilterQuery({
      minRent: 1000,
      maxRent: 3000,
      bedrooms: 0,
      bathrooms: 1,
      propertyTypes: ["apartment", "condo"]
    });
    expect([...params.keys()]).toEqual([
      "minRent",
      "maxRent",
      "bedrooms",
      "bathrooms",
      "propertyType"
    ]);
    expect(params.get("bedrooms")).toBe("0");
    expect(params.has("bedroomsExact")).toBe(false);
    expect(params.get("propertyType")).toBe("apartment,condo");
  });

  it("reports the first non-finite numeric param in wire order and still parses blanks as absent", () => {
    expect([...FILTER_QUERY_NUMERIC_PARAMS]).toEqual([
      "minRent",
      "maxRent",
      "bedrooms",
      "bathrooms"
    ]);

    const allBad = {
      minRent: "1000,2000",
      maxRent: "Infinity",
      bedrooms: "lots",
      bathrooms: "NaN"
    };
    expect(filterQuerySyntaxError(allBad)).toBe("minRent must be a finite number");
    expect(filterQuerySyntaxError({ maxRent: "Infinity", bedrooms: "lots" })).toBe(
      "maxRent must be a finite number"
    );
    expect(filterQuerySyntaxError({ bedrooms: "0", maxRent: "" })).toBeNull();
    expect(filterQuerySyntaxError({ minRent: "  " })).toBeNull();

    // Parse still drops a non-finite token. That omission is only safe
    // because the syntax check above rejects it first — a 200 of every
    // listing is what dropping `minRent=1000,2000` used to do.
    expect(parseFilterQuery(allBad)).toEqual({});
    expect(parseFilterQuery({ maxRent: "", bedrooms: "0", propertyType: "castle, condo" })).toEqual({
      bedrooms: 0,
      propertyTypes: ["condo"]
    });
  });

  it("round-trips the path the browse client sends", () => {
    const filter: PropertyFilter = {
      minRent: 1800,
      bedrooms: 2,
      bedroomsExact: true,
      propertyTypes: ["townhouse"]
    };
    const bbox = "49.2,-123.2,49.3,-123.1";
    const path = buildPropertiesQuery(filter, bbox);
    expect(path).not.toBeNull();

    const params = new URL(path!, "http://localhost:4000").searchParams;
    expect(params.get("bbox")).toBe(bbox);
    const query = Object.fromEntries(params.entries());
    delete query.bbox;
    expect(parseFilterQuery(query)).toEqual(filter);
  });
});

describe("client modules do not import the Lambda tree", () => {
  it("keeps app, components, and lib off backend/", () => {
    const offenders = CLIENT_ROOTS.flatMap((dir) => sourceFiles(join(ROOT, dir))).filter((file) =>
      importsBackend(readFileSync(file, "utf8"))
    );
    expect(offenders.map((file) => file.slice(ROOT.length + 1))).toEqual([]);
  });

  it("keeps the shared codec free of server imports", () => {
    const source = readFileSync(join(ROOT, "shared/filterQuery.ts"), "utf8");
    expect(importsBackend(source)).toBe(false);
    expect(source).not.toMatch(/@aws-sdk/);
  });
});
