export type PropertyType = "apartment" | "condo" | "house" | "townhouse";

export type City = "Vancouver" | "Richmond" | "Burnaby" | "Surrey";

/** Listing shape returned by the AWS API. Mirrors the backend Property type. */
export type Property = {
  id: string;
  title: string;
  description: string;
  rent: number;
  bedrooms: number;
  bathrooms: number;
  propertyType: PropertyType;
  squareFeet: number;
  street: string;
  city: City;
  province: string;
  postalCode: string;
  lat: number;
  lng: number;
  geohash: string;
  geohashPrefix: string;
  images: string[];
  createdAt: string;
};

// PropertyFilter has a single definition (backend/src/types.ts), re-exported
// here so the frontend imports it from @/lib/types like every other shared
// type. `export type` is erased at build time, so this pulls no backend code
// into the browser bundle. Property/PropertyType/City stay mirrored above.
export type { PropertyFilter } from "@/backend/src/types";
