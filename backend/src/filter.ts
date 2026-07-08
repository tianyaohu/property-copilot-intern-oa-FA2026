import type { Property, PropertyFilter, PropertyType } from "./types";

const PROPERTY_TYPES: readonly PropertyType[] = ["apartment", "condo", "house", "townhouse"];

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
 * parse (query → filter patch), validate (domain rule), predicate (does a
 * listing pass), serialize (filter → query params) — so adding a dimension is a
 * single entry in FILTER_FIELDS instead of the same change threaded through
 * parseFilter, validateFilter, filterProperties, and the query serializer.
 *
 * Granularity is one descriptor per *dimension*, not per field: rent owns both
 * minRent/maxRent (and their min ≤ max rule), bedrooms owns bedrooms +
 * bedroomsExact — so cross-field rules stay local to the dimension.
 */
type FilterField = {
  parse(query: Query): Partial<PropertyFilter>;
  validate?(filter: PropertyFilter): string | null;
  predicate(property: Property, filter: PropertyFilter): boolean;
  serialize(filter: PropertyFilter, params: URLSearchParams): void;
};

const rent: FilterField = {
  parse(query) {
    const patch: Partial<PropertyFilter> = {};
    const minRent = parseNumber(query.minRent);
    if (minRent !== undefined) patch.minRent = minRent;
    const maxRent = parseNumber(query.maxRent);
    if (maxRent !== undefined) patch.maxRent = maxRent;
    return patch;
  },
  validate(filter) {
    if (filter.minRent !== undefined && filter.minRent < 0) {
      return "minRent must be greater than or equal to 0";
    }
    if (filter.maxRent !== undefined && filter.maxRent < 0) {
      return "maxRent must be greater than or equal to 0";
    }
    // Cross-field rule kept inside the rent dimension. An inverted range is a
    // bad request, not "no listings" — see validateFilter's contract below.
    if (
      filter.minRent !== undefined &&
      filter.maxRent !== undefined &&
      filter.minRent > filter.maxRent
    ) {
      return "minRent must not be greater than maxRent";
    }
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
    // Minimum by default; exact count when bedroomsExact is set.
    return filter.bedroomsExact
      ? property.bedrooms === filter.bedrooms
      : property.bedrooms >= filter.bedrooms;
  },
  serialize(filter, params) {
    if (filter.bedrooms !== undefined) params.set("bedrooms", String(filter.bedrooms));
    if (filter.bedroomsExact) params.set("bedroomsExact", "true");
  }
};

const bathrooms: FilterField = {
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
      .filter((raw): raw is PropertyType => PROPERTY_TYPES.includes(raw as PropertyType));
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
 * a filter is one entry here (plus the field on PropertyFilter in types.ts).
 * Order is only observable in validateFilter (first violation wins) and matches
 * the original hand-written field order.
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
 * Per-field syntax only (blank/unparseable/invalid-enum values are omitted, not
 * rejected) — domain-level range rules live in validateFilter.
 */
export function parseFilter(query: Query): PropertyFilter {
  return FILTER_FIELDS.reduce<PropertyFilter>(
    (filter, field) => Object.assign(filter, field.parse(query)),
    {}
  );
}

/**
 * Validate a parsed PropertyFilter's domain rules (no negative bound, no
 * inverted rent range). Separate from parseFilter, which only handles per-field
 * syntax — an inverted or negative range should fail the whole request instead
 * of being quietly dropped, since filterProperties would otherwise return an
 * empty result that reads as "no listings" rather than "bad request". Returns
 * the first violation message, or null when the filter is valid.
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
 * frontend API client (lib/api.ts) so the wire format has one owner.
 */
export function serializeFilter(filter: PropertyFilter): URLSearchParams {
  const params = new URLSearchParams();
  for (const field of FILTER_FIELDS) field.serialize(filter, params);
  return params;
}
