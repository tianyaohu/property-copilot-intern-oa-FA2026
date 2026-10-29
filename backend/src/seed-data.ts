import { CITIES, PROPERTY_TYPES, type City, type Property } from "./types";

export type SeedProperty = Omit<Property, "geohash" | "geohashPrefix">;

/** Deterministic PRNG so the seed data set is identical on every run. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type CitySpec = {
  name: City;
  lat: number;
  lng: number;
  fsa: string; // postal code forward sortation area, e.g. "V6B"
  streets: string[];
};

// Approximate city centres in Metro Vancouver. Listings are scattered around
// each centre so they spread across the map rather than stacking on one point.
// Which cities exist, and the order this generator indexes, comes from the
// shared CITIES list. That order is load-bearing: the seeded catalogue is
// deterministic.
const CITY_DETAILS: Record<City, Omit<CitySpec, "name">> = {
  Vancouver: {
    lat: 49.2827,
    lng: -123.1207,
    fsa: "V6B",
    streets: ["Robson St", "Davie St", "Main St", "Cambie St", "Hastings St", "Granville St"]
  },
  Richmond: {
    lat: 49.1666,
    lng: -123.1336,
    fsa: "V6X",
    streets: ["No. 3 Rd", "Westminster Hwy", "Garden City Rd", "Granville Ave", "Cook Rd"]
  },
  Burnaby: {
    lat: 49.2488,
    lng: -122.9805,
    fsa: "V5H",
    streets: ["Kingsway", "Willingdon Ave", "Hastings St", "Canada Way", "Lougheed Hwy"]
  },
  Surrey: {
    lat: 49.1913,
    lng: -122.849,
    fsa: "V3T",
    streets: ["King George Blvd", "Fraser Hwy", "104 Ave", "152 St", "Scott Rd"]
  }
};

const CITY_SPECS: CitySpec[] = CITIES.map((name) => ({ name, ...CITY_DETAILS[name] }));

function postalCode(fsa: string, rng: () => number): string {
  const digit = () => Math.floor(rng() * 10);
  const letter = () => String.fromCharCode(65 + Math.floor(rng() * 26));
  return `${fsa} ${digit()}${letter()}${digit()}`;
}

/**
 * Generate 50 rental listings spread across Vancouver, Richmond, Burnaby, and
 * Surrey. Deterministic: same data every run, so the map and tests are stable.
 */
export function generateProperties(count = 50): SeedProperty[] {
  const rng = mulberry32(42);
  const properties: SeedProperty[] = [];

  for (let i = 0; i < count; i += 1) {
    const city = CITY_SPECS[i % CITY_SPECS.length];
    const propertyType = PROPERTY_TYPES[Math.floor(rng() * PROPERTY_TYPES.length)];

    // Scatter within roughly +/- 3km of the city centre.
    const lat = Number((city.lat + (rng() - 0.5) * 0.06).toFixed(6));
    const lng = Number((city.lng + (rng() - 0.5) * 0.06).toFixed(6));

    const bedrooms = Math.floor(rng() * 5); // 0 (studio) .. 4
    const bathrooms = 1 + Math.floor(rng() * 3); // 1 .. 3
    const squareFeet = 400 + bedrooms * 250 + Math.floor(rng() * 300);
    const rent = 1500 + bedrooms * 600 + Math.floor(rng() * 1200);
    const streetNumber = 100 + Math.floor(rng() * 8900);
    const street = city.streets[Math.floor(rng() * city.streets.length)];

    const id = `prop-${String(i + 1).padStart(3, "0")}`;
    const bedroomLabel = bedrooms === 0 ? "Studio" : `${bedrooms} Bed`;

    properties.push({
      id,
      title: `${bedroomLabel} ${propertyType} in ${city.name}`,
      description: `A ${squareFeet} sq ft ${propertyType} near ${street} in ${city.name}, BC. ${bedrooms} bed / ${bathrooms} bath.`,
      rent,
      bedrooms,
      bathrooms,
      propertyType,
      squareFeet,
      street: `${streetNumber} ${street}`,
      city: city.name,
      province: "BC",
      postalCode: postalCode(city.fsa, rng),
      lat,
      lng,
      // Five stable placeholder images per listing (deterministic seeds).
      images: Array.from(
        { length: 5 },
        (_unused, n) => `https://picsum.photos/seed/${id}-${n + 1}/800/600`
      ),
      createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString()
    });
  }

  return properties;
}

export const SEED_PROPERTIES: SeedProperty[] = generateProperties();
