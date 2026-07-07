export type PropertyType = "apartment" | "condo" | "house" | "townhouse";

export type City = "Vancouver" | "Richmond" | "Burnaby" | "Surrey";

/**
 * A rental listing. This is the full item shape stored in DynamoDB.
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
  bedrooms?: number; // minimum number of bedrooms, or exact count when bedroomsExact is true
  bedroomsExact?: boolean;
  bathrooms?: number; // minimum number of bathrooms
  propertyType?: PropertyType;
};
