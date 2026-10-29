import { serializeFilter } from "@/backend/src/filter";
import { apiGet } from "@/lib/api";
import type { PropertiesListResponse, Property, PropertyFilter } from "@/lib/types";

const LOAD_ERROR = "Failed to load listings";

export type PropertiesQueryResult =
  | { status: "success"; properties: Property[]; truncated: boolean }
  | { status: "aborted" }
  | { status: "cancelled"; reason: "missing-viewport" }
  | { status: "error"; message: string };

export type LoadPropertiesInput = {
  filter?: PropertyFilter;
  /**
   * Map viewport as "minLat,minLng,maxLat,maxLng", already serialized by the
   * map. This module does not parse or rewrite it. Null/undefined means the
   * map has not reported a viewport yet, so no request is issued.
   */
  bbox?: string | null;
  signal?: AbortSignal;
};

/**
 * Build the `/properties` path for a renter filter and a viewport.
 * Returns null when `bbox` is missing — the list API requires a viewport, and
 * callers must not invent one. Filter params are whatever `serializeFilter`
 * emits (the shared registry), appended after `bbox`.
 */
export function buildPropertiesQuery(
  filter: PropertyFilter = {},
  bbox?: string | null
): string | null {
  if (bbox == null) return null;
  const params = new URLSearchParams();
  params.set("bbox", bbox);
  serializeFilter(filter).forEach((value, key) => params.set(key, value));
  return `/properties?${params.toString()}`;
}

function isAbortError(err: unknown): boolean {
  return (err as { name?: string } | null)?.name === "AbortError";
}

/**
 * Partial decode of the shared list body. A 200 that omits `properties` is
 * an error; a missing `truncated` is treated as false. Field names come from
 * PropertiesListResponse so this guard cannot drift from the wire contract.
 */
type PropertiesListBody = Partial<Pick<PropertiesListResponse, "properties" | "truncated">>;

/**
 * Issue GET `/properties` for the current filter and viewport.
 * Never rejects for an expected outcome: a missing viewport or an aborted
 * signal is not a failed load, and HTTP / network failures become `{ status:
 * "error" }` with the message the UI already shows.
 */
export async function loadProperties(input: LoadPropertiesInput = {}): Promise<PropertiesQueryResult> {
  const path = buildPropertiesQuery(input.filter ?? {}, input.bbox);
  if (path === null) {
    return { status: "cancelled", reason: "missing-viewport" };
  }
  if (input.signal?.aborted) {
    return { status: "aborted" };
  }

  try {
    const data = await apiGet<PropertiesListBody | null>(path, input.signal);
    // The signal can abort after the body is read but before we hand the
    // payload back. Drop it so a superseded viewport cannot win the race.
    if (input.signal?.aborted) {
      return { status: "aborted" };
    }
    if (!data || !Array.isArray(data.properties)) {
      return { status: "error", message: LOAD_ERROR };
    }
    return {
      status: "success",
      properties: data.properties,
      truncated: data.truncated ?? false
    };
  } catch (err) {
    if (isAbortError(err)) return { status: "aborted" };
    return {
      status: "error",
      message: err instanceof Error ? err.message : LOAD_ERROR
    };
  }
}
