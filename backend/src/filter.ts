import { isPropertyType, rentRangeIssue, type Property, type PropertyFilter } from "./types";

type Query = Record<string, string | undefined>;

/**
 * Parse one numeric query param. Blank values are rejected explicitly:
 * Number("") and Number("  ") are 0, so without the trim guard a URL like
 * `?maxRent=` would silently filter out every listing instead of being ignored.
 */
function parseNumber(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === "") {
    return undefined;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * A filter dimension, defined once. Each descriptor owns its whole lifecycle —
 * parse (query → filter patch), syntax (reject a non-finite raw token),
 * validate (domain rule), predicate (does a listing pass), serialize (filter →
 * query params) — so adding a dimension is a single entry in FILTER_FIELDS
 * instead of the same change threaded through parseFilter, validateFilterQuery,
 * validateFilter, filterProperties, and the query serializer.
 *
 * Granularity is one descriptor per *dimension*, not per field: rent owns both
 * minRent/maxRent (and their min ≤ max rule), bedrooms owns bedrooms +
 * bedroomsExact — so cross-field rules stay local to the dimension.
 */
type FilterField = {
  parse(query: Query): Partial<PropertyFilter>;
  /**
   * Raw query syntax for this dimension. Blank values are not errors (they are
   * omitted, same as an absent param). A non-blank value that is not a finite
   * number is an error: dropping it would apply no constraint and return a
   * 200 of every listing in the viewport.
   */
  syntax?(query: Query): string | null;
  validate?(filter: PropertyFilter): string | null;
  predicate(property: Property, filter: PropertyFilter): boolean;
  serialize(filter: PropertyFilter, params: URLSearchParams): void;
};

/**
 * Blank stays "no constraint". Anything else that Number() cannot accept
 * (`lots`, `1000,2000` from a repeated query key, `Infinity`) must not be
 * parsed as "absent" — the caller rejects the request instead.
 */
function finiteNumberSyntax(name: string, raw: string | undefined): string | null {
  if (raw === undefined || raw.trim() === "") return null;
  if (!Number.isFinite(Number(raw))) return `${name} must be a finite number`;
  return null;
}

const rent: FilterField = {
  syntax(query) {
    return (
      finiteNumberSyntax("minRent", query.minRent) ?? finiteNumberSyntax("maxRent", query.maxRent)
    );
  },
  parse(query) {
    const patch: Partial<PropertyFilter> = {};
    const minRent = parseNumber(query.minRent);
    if (minRent !== undefined) patch.minRent = minRent;
    const maxRent = parseNumber(query.maxRent);
    if (maxRent !== undefined) patch.maxRent = maxRent;
    return patch;
  },
  validate(filter) {
    // The accept/reject decision is rentRangeIssue, shared with the price
    // filter UI. These strings are the API's stable error text; an inverted
    // range is a bad request, not "no listings" — see validateFilter below.
    const issue = rentRangeIssue(filter.minRent, filter.maxRent);
    if (issue === "non-finite-min") return "minRent must be a finite number";
    if (issue === "non-finite-max") return "maxRent must be a finite number";
    if (issue === "negative-min") return "minRent must be greater than or equal to 0";
    if (issue === "negative-max") return "maxRent must be greater than or equal to 0";
    if (issue === "inverted") return "minRent must not be greater than maxRent";
    return null;
  },
  predicate(property, filter) {
    if (filter.minRent !== undefined && property.rent < filter.minRent) return false;
    if (filter.maxRent !== undefined && property.rent > filter.maxRent) return false;
    return true;
  },
  serialize(filter, params) {
    if (filter.minRent !== undefined) params.set("minRent", String(filter.minRent));
    if (filter.maxRent !== undefined) params.set("maxRent", String(filter.maxRent));
  }
};

const bedrooms: FilterField = {
  syntax(query) {
    return finiteNumberSyntax("bedrooms", query.bedrooms);
  },
  parse(query) {
    const patch: Partial<PropertyFilter> = {};
    const value = parseNumber(query.bedrooms);
    if (value !== undefined) patch.bedrooms = value;
    if (query.bedroomsExact === "true") patch.bedroomsExact = true;
    return patch;
  },
  validate(filter) {
    if (filter.bedrooms !== undefined && filter.bedrooms < 0) {
      return "bedrooms must be greater than or equal to 0";
    }
    return null;
  },
  predicate(property, filter) {
    if (filter.bedrooms === undefined) return true;
    // Studio is always exact. A minimum of 0 matches every listing (counts
    // are never negative), and the UI labels bedrooms=0 as "Studio" — so
    // treating it as "at least 0" makes the chip look active while the
    // result set does not change. bedroomsExact still switches a positive
    // count between "exactly N" and "at least N"; an explicit false does
    // not widen studio back into a match-all.
    if (filter.bedrooms === 0 || filter.bedroomsExact) {
      return property.bedrooms === filter.bedrooms;
    }
    return property.bedrooms >= filter.bedrooms;
  },
  serialize(filter, params) {
    if (filter.bedrooms !== undefined) params.set("bedrooms", String(filter.bedrooms));
    if (filter.bedroomsExact) params.set("bedroomsExact", "true");
  }
};

const bathrooms: FilterField = {
  syntax(query) {
    return finiteNumberSyntax("bathrooms", query.bathrooms);
  },
  parse(query) {
    const patch: Partial<PropertyFilter> = {};
    const value = parseNumber(query.bathrooms);
    if (value !== undefined) patch.bathrooms = value;
    return patch;
  },
  validate(filter) {
    if (filter.bathrooms !== undefined && filter.bathrooms < 0) {
      return "bathrooms must be greater than or equal to 0";
    }
    return null;
  },
  predicate(property, filter) {
    if (filter.bathrooms === undefined) return true;
    return property.bathrooms >= filter.bathrooms; // inclusive minimum
  },
  serialize(filter, params) {
    if (filter.bathrooms !== undefined) params.set("bathrooms", String(filter.bathrooms));
  }
};

const propertyTypes: FilterField = {
  parse(query) {
    // Comma-separated list; keep only the valid enum values, drop the rest (an
    // unknown type is ignored, not rejected — same as a bad number).
    if (query.propertyType === undefined) return {};
    const types = query.propertyType
      .split(",")
      .map((raw) => raw.trim())
      .filter(isPropertyType);
    return types.length > 0 ? { propertyTypes: types } : {};
  },
  predicate(property, filter) {
    // Empty/absent selection constrains nothing; otherwise match any (OR).
    if (!filter.propertyTypes?.length) return true;
    return filter.propertyTypes.includes(property.propertyType);
  },
  serialize(filter, params) {
    // Multiple types ride on one comma-separated param; parse splits it back.
    if (filter.propertyTypes?.length) params.set("propertyType", filter.propertyTypes.join(","));
  }
};

/**
 * The filter registry — the single source of truth for every dimension. Adding
 * a filter is one entry here (plus the field on PropertyFilter in shared/contract.ts).
 * Order is only observable when a validator reports the first violation
 * (validateFilterQuery, then validateFilter) and matches the original
 * hand-written field order.
 */
const FILTER_FIELDS: readonly FilterField[] = [rent, bedrooms, bathrooms, propertyTypes];

/**
 * Apply renter filters to a list of properties. Pure and side-effect free so it
 * is easy to unit test and reuse on either side of the wire. Filters compose
 * conjunctively: a listing passes only if every field's predicate holds.
 */
export function filterProperties(properties: Property[], filter: PropertyFilter): Property[] {
  return properties.filter((property) =>
    FILTER_FIELDS.every((field) => field.predicate(property, filter))
  );
}

/**
 * Parse raw query-string values into a PropertyFilter, one dimension at a time.
 * Blank values and anything that is not a finite number are omitted here.
 * That omission is only safe for numbers because validateFilterQuery rejects
 * them first at the HTTP boundary — otherwise `?minRent=1000,2000` would look
 * like "no rent filter" and return every listing. Invalid property-type
 * tokens are still dropped (an unknown type does not fail the request).
 * Domain-level range rules live in validateFilter.
 */
export function parseFilter(query: Query): PropertyFilter {
  return FILTER_FIELDS.reduce<PropertyFilter>(
    (filter, field) => Object.assign(filter, field.parse(query)),
    {}
  );
}

/**
 * Reject raw numeric params that are present but not finite numbers.
 * Blank (`?maxRent=`) stays valid and means "no bound" — Number("") is 0, so
 * treating blank as zero would hide every listing. A comma-joined duplicate
 * (`minRent=1000&minRent=2000` → `1000,2000` on HTTP API payload 2.0) or any
 * other non-numeric token is a bad request, not a silent no-op.
 * Returns the first violation, in registry order, or null.
 */
export function validateFilterQuery(query: Query): string | null {
  for (const field of FILTER_FIELDS) {
    const error = field.syntax?.(query);
    if (error) return error;
  }
  return null;
}

/**
 * Validate a parsed PropertyFilter's domain rules (finite rent bounds, no
 * negative bound, no inverted rent range). Separate from validateFilterQuery,
 * which rejects non-finite raw tokens before they can be omitted. An inverted
 * or negative range fails the whole request instead of being quietly dropped,
 * since filterProperties would otherwise return an empty result that reads as
 * "no listings" rather than "bad request". A non-finite bound fails the
 * request too: NaN passes every comparison, so the predicate would keep every
 * listing. Returns the first violation message, or null when the filter is valid.
 */
export function validateFilter(filter: PropertyFilter): string | null {
  for (const field of FILTER_FIELDS) {
    const error = field.validate?.(filter);
    if (error) return error;
  }
  return null;
}

/**
 * Serialize a PropertyFilter to query params — the exact inverse of parseFilter,
 * driven by the same registry so the two can never drift. Shared with the
 * frontend properties query (lib/propertiesQuery.ts) so the wire format has one owner.
 */
export function serializeFilter(filter: PropertyFilter): URLSearchParams {
  const params = new URLSearchParams();
  for (const field of FILTER_FIELDS) field.serialize(filter, params);
  return params;
}
