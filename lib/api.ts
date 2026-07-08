import type { Property, PropertyFilter } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

/** Thin fetch wrapper around the AWS backend. Throws on non-2xx responses. */
async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    signal
  });

  // Non-JSON bodies become null so the status check below still produces a
  // useful error — but an abort mid-body-read must stay an AbortError, or a
  // cancelled stale request would surface upstream as a real failure.
  const body = await response.json().catch((err: unknown) => {
    if ((err as Error)?.name === "AbortError") throw err;
    return null;
  });
  if (!response.ok) {
    throw new Error(body?.error ?? `Request failed (${response.status})`);
  }
  return body as T;
}

function toQueryString(filter: PropertyFilter, bbox?: string): string {
  const params = new URLSearchParams();
  if (bbox !== undefined) params.set("bbox", bbox);
  if (filter.minRent !== undefined) params.set("minRent", String(filter.minRent));
  if (filter.maxRent !== undefined) params.set("maxRent", String(filter.maxRent));
  if (filter.bedrooms !== undefined) params.set("bedrooms", String(filter.bedrooms));
  if (filter.bedroomsExact) params.set("bedroomsExact", "true");
  if (filter.bathrooms !== undefined) params.set("bathrooms", String(filter.bathrooms));
  // Multiple types ride on one comma-separated param; the backend splits it.
  if (filter.propertyTypes?.length) params.set("propertyType", filter.propertyTypes.join(","));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export type FetchPropertiesOptions = {
  /** Map viewport as "minLat,minLng,maxLat,maxLng". Required by the API. */
  bbox?: string;
  signal?: AbortSignal;
};

export type PropertiesResult = {
  properties: Property[];
  /** True when the server clipped the response to its result cap. */
  truncated: boolean;
};

export async function fetchProperties(
  filter: PropertyFilter = {},
  options: FetchPropertiesOptions = {}
): Promise<PropertiesResult> {
  const data = await apiGet<{ properties: Property[]; truncated?: boolean }>(
    `/properties${toQueryString(filter, options.bbox)}`,
    options.signal
  );
  return { properties: data.properties, truncated: data.truncated ?? false };
}

export async function fetchProperty(id: string): Promise<Property> {
  const data = await apiGet<{ property: Property }>(`/properties/${id}`);
  return data.property;
}
