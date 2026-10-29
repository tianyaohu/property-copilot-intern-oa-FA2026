import type { Property, PropertyResponse } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

/**
 * Thin fetch wrapper around the AWS backend. Throws on non-2xx responses.
 * The properties list does not call this from UI code — `loadProperties`
 * (lib/propertiesQuery.ts) turns the throw and AbortError into a typed result.
 */
export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
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

function isProperty(value: unknown): value is Property {
  if (!value || typeof value !== "object") return false;
  const id = (value as { id?: unknown }).id;
  return typeof id === "string" && id !== "";
}

/**
 * GET `/properties/:id`. The id is one path segment: a raw slash, `?`, or `%`
 * would be parsed as extra path, a query string, or a malformed escape, and
 * the detail route would 404, 500, or return a different listing while this
 * call still looked successful. A 200 that is not the detail envelope — the
 * list body `{ properties, count, truncated }` has no `property` — is a
 * failure, not a listing.
 */
export async function fetchProperty(id: string): Promise<Property> {
  const data = await apiGet<Partial<PropertyResponse> | null>(
    `/properties/${encodeURIComponent(id)}`
  );
  if (!data || !isProperty(data.property)) {
    throw new Error("Failed to load listing");
  }
  return data.property;
}
