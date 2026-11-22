import type { PropertyFilter } from "@/shared/contract";
import { parseFilter, serializeFilter, type FilterQuery } from "@/shared/filterQuery";

/**
 * Page-URL keys owned by the listings filter codec. The map viewport is not
 * one of them: bbox stays on the API request, which the map rebuilds after
 * mount, and is not restored from the address bar.
 */
const FILTER_QUERY_KEYS = [
  "minRent",
  "maxRent",
  "bedrooms",
  "bedroomsExact",
  "bathrooms",
  "propertyType"
] as const;

function isFilterQueryKey(key: string): boolean {
  return (FILTER_QUERY_KEYS as readonly string[]).includes(key);
}

/** Parse the browse address bar with the same codec the API uses. */
export function filterFromSearch(search: string): PropertyFilter {
  const params = new URLSearchParams(search);
  const query: FilterQuery = {};
  for (const key of FILTER_QUERY_KEYS) {
    const value = params.get(key);
    if (value !== null) query[key] = value;
  }
  return parseFilter(query);
}

/**
 * Search string for `filter`, preserving query keys this codec does not own.
 * Returns "" when nothing remains, so the address bar can drop the "?".
 */
export function searchFromFilter(filter: PropertyFilter, currentSearch = ""): string {
  const current = new URLSearchParams(currentSearch);
  const next = serializeFilter(filter);
  for (const [key, value] of current) {
    if (!isFilterQueryKey(key)) next.append(key, value);
  }
  const qs = next.toString();
  return qs ? `?${qs}` : "";
}

export function sameFilter(a: PropertyFilter, b: PropertyFilter): boolean {
  const types = (list?: PropertyFilter["propertyTypes"]) => (list ?? []).join("\0");
  return (
    a.minRent === b.minRent &&
    a.maxRent === b.maxRent &&
    a.bedrooms === b.bedrooms &&
    Boolean(a.bedroomsExact) === Boolean(b.bedroomsExact) &&
    a.bathrooms === b.bathrooms &&
    types(a.propertyTypes) === types(b.propertyTypes)
  );
}

/** Replace the current page's query with `filter`. No navigation, no scroll jump. */
export function replaceFilterSearch(filter: PropertyFilter): void {
  const nextSearch = searchFromFilter(filter, window.location.search);
  const next = `${window.location.pathname}${nextSearch}${window.location.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) return;
  window.history.replaceState(window.history.state, "", next);
}
