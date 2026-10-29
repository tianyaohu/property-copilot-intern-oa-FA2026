/**
 * Wire contract shared by the Next.js client and the Lambda API.
 *
 * Listing and filter shapes, the property-type and city enums, and the JSON
 * bodies for the property routes live here so the two sides cannot drift.
 * Query parse/serialize stays next to the filter predicates in
 * backend/src/filter.ts and imports these types. Rent-range *decisions* live
 * here too; each boundary keeps its own message text.
 */

export const PROPERTY_TYPES = ["apartment", "condo", "house", "townhouse"] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const CITIES = ["Vancouver", "Richmond", "Burnaby", "Surrey"] as const;

export type City = (typeof CITIES)[number];

export function isPropertyType(value: string): value is PropertyType {
  return (PROPERTY_TYPES as readonly string[]).includes(value);
}

/**
 * A rental listing. This is the full item shape stored in DynamoDB and the
 * JSON shape returned by the API.
 *
 * `geohash` and `geohashPrefix` exist to support geospatial queries: items in
 * nearby locations share a geohash prefix, so a bounding-box query can be
 * answered by querying a handful of prefixes on the GSI instead of scanning the
 * whole table. See `backend/src/geo.ts`.
 */
export type Property = {
  id: string;
  title: string;
  description: string;
  // Money is stored in whole CAD dollars per month.
  rent: number;
  bedrooms: number;
  bathrooms: number;
  propertyType: PropertyType;
  squareFeet: number;
  // Address.
  street: string;
  city: City;
  province: string;
  postalCode: string;
  // Location.
  lat: number;
  lng: number;
  // Derived geospatial index attributes (see geo.ts). Set at write time.
  geohash: string;
  geohashPrefix: string;
  // Exactly five image URLs per listing.
  images: string[];
  createdAt: string;
};

/** Filters a renter can apply. All optional; absent fields are not constrained. */
export type PropertyFilter = {
  minRent?: number;
  maxRent?: number;
  bedrooms?: number; // minimum bedrooms, or exact count when 0 (studio) or bedroomsExact is true
  bedroomsExact?: boolean;
  bathrooms?: number; // minimum number of bathrooms
  propertyTypes?: PropertyType[]; // match any of these types; empty/absent = all
};

/** JSON body of GET /properties. `count` is the length after the result cap. */
export type PropertiesListResponse = {
  properties: Property[];
  count: number;
  truncated: boolean;
};

/** JSON body of GET /properties/:id. */
export type PropertyResponse = {
  property: Property;
};

export function propertiesListResponse(
  properties: Property[],
  truncated: boolean
): PropertiesListResponse {
  return { properties, count: properties.length, truncated };
}

export function propertyResponse(property: Property): PropertyResponse {
  return { property };
}

/**
 * Why a rent range is rejected. Shared by the API validator and the price
 * filter so the accept/reject decision cannot drift; each side maps the issue
 * onto its own copy (stable API error text vs UI sentences).
 *
 * Order is part of the contract: a negative bound is reported before an
 * inverted range when both are wrong.
 */
export type RentRangeIssue = "negative-min" | "negative-max" | "inverted";

export function rentRangeIssue(minRent?: number, maxRent?: number): RentRangeIssue | null {
  if (minRent !== undefined && minRent < 0) return "negative-min";
  if (maxRent !== undefined && maxRent < 0) return "negative-max";
  if (minRent !== undefined && maxRent !== undefined && minRent > maxRent) return "inverted";
  return null;
}
