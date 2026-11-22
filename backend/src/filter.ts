import { filterQuerySyntaxError, parseFilter, serializeFilter } from "../../shared/filterQuery";
import { rentRangeIssue, type Property, type PropertyFilter } from "./types";

/**
 * Server half of a listings filter. The wire codec — param names, parse,
 * serialize, and the non-finite-token check — lives in shared/filterQuery.ts
 * and is re-exported here so existing API imports keep their names. These
 * descriptors own what the client must not: domain-error copy and the match
 * predicate. Adding a dimension is a codec change plus one entry below.
 *
 * Order is observable when validateFilter reports the first violation, and
 * it matches the original hand-written field order (rent, bedrooms,
 * bathrooms, property type).
 */
type FilterField = {
  validate?(filter: PropertyFilter): string | null;
  predicate(property: Property, filter: PropertyFilter): boolean;
};

const rent: FilterField = {
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
  }
};

const bedrooms: FilterField = {
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
  }
};

const bathrooms: FilterField = {
  validate(filter) {
    if (filter.bathrooms !== undefined && filter.bathrooms < 0) {
      return "bathrooms must be greater than or equal to 0";
    }
    return null;
  },
  predicate(property, filter) {
    if (filter.bathrooms === undefined) return true;
    return property.bathrooms >= filter.bathrooms; // inclusive minimum
  }
};

const propertyTypes: FilterField = {
  predicate(property, filter) {
    // Empty/absent selection constrains nothing; otherwise match any (OR).
    if (!filter.propertyTypes?.length) return true;
    return filter.propertyTypes.includes(property.propertyType);
  }
};

const FILTER_FIELDS: readonly FilterField[] = [rent, bedrooms, bathrooms, propertyTypes];

/**
 * Apply renter filters to a list of properties. Pure and side-effect free so it
 * is easy to unit test. The client does not import this — matching stays on
 * the server. Filters compose conjunctively: a listing passes only if every
 * field's predicate holds.
 */
export function filterProperties(properties: Property[], filter: PropertyFilter): Property[] {
  return properties.filter((property) =>
    FILTER_FIELDS.every((field) => field.predicate(property, filter))
  );
}

/**
 * Wire codec, re-exported so API modules keep importing it from here.
 * parseFilter omits blank and non-finite numbers; validateFilterQuery
 * (filterQuerySyntaxError) must run first or `?minRent=1000,2000` would
 * look like "no rent filter". Unknown property-type tokens are still
 * dropped. Domain rules stay in validateFilter.
 */
export { filterQuerySyntaxError as validateFilterQuery, parseFilter, serializeFilter };

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
