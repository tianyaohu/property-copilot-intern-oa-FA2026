import { isPropertyType, type PropertyFilter } from "./contract";

/**
 * Wire codec for a listings filter: the query params on GET /properties,
 * their parse, their serialize, and the "this token is not a finite number"
 * check.
 *
 * This used to live inside backend/src/filter.ts, next to the match
 * predicates. The browse client imported that server module just to call
 * serializeFilter, so the browser dependency graph included studio matching
 * and the API's domain-error copy. Predicates and domain messages stay in
 * the backend module. Parse and serialize stay here, in one place, because
 * they are inverses — a field written by one and not read by the other
 * would drop a filter the UI had committed.
 *
 * Numeric params share one list. Syntax, parse, and serialize all walk it,
 * so a new bound cannot be parsed while its non-finite token is still
 * silently omitted (that omission used to answer 200 with every listing in
 * the viewport). bedroomsExact and propertyType are not numbers; they are
 * handled beside that list. Blank values are "no constraint": Number("") is
 * 0, and treating a blank as zero would hide every listing or turn an empty
 * bedrooms param into a studio search.
 */
export type FilterQuery = Record<string, string | undefined>;

export const FILTER_QUERY_NUMERIC_PARAMS = ["minRent", "maxRent", "bedrooms", "bathrooms"] as const;

function parseNumber(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function finiteNumberSyntax(name: string, raw: string | undefined): string | null {
  if (raw === undefined || raw.trim() === "") return null;
  if (!Number.isFinite(Number(raw))) return `${name} must be a finite number`;
  return null;
}

/**
 * First raw numeric token that is present and not a finite number, in
 * FILTER_QUERY_NUMERIC_PARAMS order. Blank is not an error. The API
 * re-exports this as validateFilterQuery and rejects the request before
 * parseFilter can omit the token.
 */
export function filterQuerySyntaxError(query: FilterQuery): string | null {
  for (const name of FILTER_QUERY_NUMERIC_PARAMS) {
    const error = finiteNumberSyntax(name, query[name]);
    if (error) return error;
  }
  return null;
}

export function parseFilter(query: FilterQuery): PropertyFilter {
  const filter: PropertyFilter = {};

  for (const name of FILTER_QUERY_NUMERIC_PARAMS) {
    const value = parseNumber(query[name]);
    if (value !== undefined) filter[name] = value;
  }

  // Only the literal "true" turns on exact bedroom matching. Any other
  // token, including a blank, leaves the field absent so a minimum-bedrooms
  // filter is not accidentally narrowed. Studio exactness is not decided
  // here: bedrooms=0 stays a number and the predicate treats 0 as exact.
  if (query.bedroomsExact === "true") filter.bedroomsExact = true;

  if (query.propertyType !== undefined) {
    // Comma-separated, matching HTTP API payload 2.0's joined repeats.
    // Unknown tokens are dropped, not rejected — a bad type does not fail
    // the request the way a bad number does.
    const types = query.propertyType
      .split(",")
      .map((raw) => raw.trim())
      .filter(isPropertyType);
    if (types.length > 0) filter.propertyTypes = types;
  }

  return filter;
}

export function serializeFilter(filter: PropertyFilter): URLSearchParams {
  const params = new URLSearchParams();

  for (const name of FILTER_QUERY_NUMERIC_PARAMS) {
    const value = filter[name];
    if (value !== undefined) params.set(name, String(value));
    // Exactness sits immediately after bedrooms, which is the order the
    // client query and the round-trip tests already lock in.
    if (name === "bedrooms" && filter.bedroomsExact) params.set("bedroomsExact", "true");
  }

  if (filter.propertyTypes?.length) params.set("propertyType", filter.propertyTypes.join(","));

  return params;
}
