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

export type PropertyFilter = {
  minRent?: number;
  maxRent?: number;
  bedrooms?: number; // minimum number of bedrooms, or exact count when bedroomsExact is true
  bedroomsExact?: boolean;
  bathrooms?: number; // minimum number of bathrooms
  propertyTypes?: PropertyType[]; // match any of these types; empty/absent = all
};
