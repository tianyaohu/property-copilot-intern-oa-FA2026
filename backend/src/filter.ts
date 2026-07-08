import type { Property, PropertyFilter, PropertyType } from "./types";

const PROPERTY_TYPES: readonly PropertyType[] = ["apartment", "condo", "house", "townhouse"];

/**
 * Apply renter filters to a list of properties. Pure and side-effect free so it
 * is easy to unit test and reuse on either side of the wire.
 *
 * Filters compose: every provided constraint must hold for an item to pass.
 * Rent is an inclusive range; bathrooms is an inclusive minimum; bedrooms is
 * an inclusive minimum by default, or an exact match when bedroomsExact is
 * set; property type matches any of the selected types (empty/absent = all).
 */
export function filterProperties(properties: Property[], filter: PropertyFilter): Property[] {
  return properties.filter((property) => {
    if (filter.minRent !== undefined && property.rent < filter.minRent) {
      return false;
    }
    if (filter.maxRent !== undefined && property.rent > filter.maxRent) {
      return false;
    }
    if (filter.bedrooms !== undefined) {
      const bedroomsMatch = filter.bedroomsExact
        ? property.bedrooms === filter.bedrooms
        : property.bedrooms >= filter.bedrooms;
      if (!bedroomsMatch) {
        return false;
      }
    }
    if (filter.bathrooms !== undefined && property.bathrooms < filter.bathrooms) {
      return false;
    }
    if (filter.propertyTypes?.length && !filter.propertyTypes.includes(property.propertyType)) {
      return false;
    }
    return true;
  });
}

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
 * Validate a parsed PropertyFilter's domain rules: no negative bound, and a
 * rent range that isn't inverted. Separate from parseFilter, which only
 * handles per-field syntax (a bad propertyType or unparseable number is
 * silently dropped there, not rejected) — an inverted or negative range is a
 * different kind of problem, one that should fail the whole request instead
 * of being quietly ignored, since filterProperties would otherwise just
 * return an empty result that looks like "no listings" rather than "bad
 * request".
 */
export function validateFilter(filter: PropertyFilter): string | null {
  if (filter.minRent !== undefined && filter.minRent < 0) {
    return "minRent must be greater than or equal to 0";
  }
  if (filter.maxRent !== undefined && filter.maxRent < 0) {
    return "maxRent must be greater than or equal to 0";
  }
  if (filter.bedrooms !== undefined && filter.bedrooms < 0) {
    return "bedrooms must be greater than or equal to 0";
  }
  if (filter.bathrooms !== undefined && filter.bathrooms < 0) {
    return "bathrooms must be greater than or equal to 0";
  }
  if (
    filter.minRent !== undefined &&
    filter.maxRent !== undefined &&
    filter.minRent > filter.maxRent
  ) {
    return "minRent must not be greater than maxRent";
  }
  return null;
}

/** Parse raw query-string values into a PropertyFilter, one field at a time.
 * Per-field syntax only (blank/unparseable/invalid-enum values are omitted,
 * not rejected) — domain-level range rules live in validateFilter. */
export function parseFilter(query: Record<string, string | undefined>): PropertyFilter {
  const filter: PropertyFilter = {};

  const minRent = parseNumber(query.minRent);
  if (minRent !== undefined) filter.minRent = minRent;

  const maxRent = parseNumber(query.maxRent);
  if (maxRent !== undefined) filter.maxRent = maxRent;

  const bedrooms = parseNumber(query.bedrooms);
  if (bedrooms !== undefined) filter.bedrooms = bedrooms;
  if (query.bedroomsExact === "true") filter.bedroomsExact = true;

  const bathrooms = parseNumber(query.bathrooms);
  if (bathrooms !== undefined) filter.bathrooms = bathrooms;

  // Comma-separated list of types; keep only the valid enum values, drop the
  // rest (an unknown type is ignored, not rejected — same as a bad number).
  if (query.propertyType !== undefined) {
    const types = query.propertyType
      .split(",")
      .map((raw) => raw.trim())
      .filter((raw): raw is PropertyType => PROPERTY_TYPES.includes(raw as PropertyType));
    if (types.length > 0) {
      filter.propertyTypes = types;
    }
  }

  return filter;
}
