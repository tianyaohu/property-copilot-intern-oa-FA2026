import { CAD } from "@/lib/format";
import type { PropertyFilter, PropertyType } from "@/lib/types";

/** Shared prop shape for every filter body. `onChange` receives the full next
 * filter (bodies merge their patch), so the same body works standalone in a
 * quick menu and stacked inside the master panel. */
export type FilterBodyProps = {
  filter: PropertyFilter;
  onChange: (next: PropertyFilter) => void;
};

export const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "apartment", label: "Apartment" },
  { value: "condo", label: "Condo" },
  { value: "house", label: "House" },
  { value: "townhouse", label: "Townhouse" }
];

/**
 * Bedrooms has no explicit "Any" entry — clicking the selected value again
 * clears it. Bathrooms includes an explicit "Any" and stays minimum-only (no
 * exact-match): there's no product need for an exact bathroom count.
 */
export const BEDROOM_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Studio" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" }
];

export const BATHROOM_OPTIONS: { value: number | undefined; label: string }[] = [
  { value: undefined, label: "Any" },
  { value: 1, label: "1+" },
  { value: 2, label: "2+" },
  { value: 3, label: "3+" },
  { value: 4, label: "4+" }
];

/** Number of active filter *categories* (price counts once, not min+max) —
 * drives the master chip's count badge. */
export function countActiveFilters(filter: PropertyFilter): number {
  let count = 0;
  if (filter.minRent !== undefined || filter.maxRent !== undefined) count++;
  if (filter.bedrooms !== undefined) count++;
  if (filter.bathrooms !== undefined) count++;
  if (filter.propertyTypes?.length) count++;
  return count;
}

export function priceLabel({ minRent, maxRent }: PropertyFilter): string {
  if (minRent === undefined && maxRent === undefined) return "Price";
  if (minRent !== undefined && maxRent !== undefined) {
    return `${CAD.format(minRent)} – ${CAD.format(maxRent)}`;
  }
  return minRent !== undefined ? `${CAD.format(minRent)}+` : `Up to ${CAD.format(maxRent as number)}`;
}

export function roomsLabel({ bedrooms, bedroomsExact, bathrooms }: PropertyFilter): string {
  if (bedrooms === undefined && bathrooms === undefined) return "Beds & baths";
  const parts: string[] = [];
  if (bedrooms !== undefined) {
    // "at least studio" is every listing, so never show it as a minimum;
    // an exact-match studio is still worth surfacing on its own.
    const label = bedrooms === 0 ? "Studio" : bedroomsExact ? `${bedrooms}` : `${bedrooms}+`;
    parts.push(`${label} bd`);
  }
  if (bathrooms !== undefined) parts.push(`${bathrooms}+ ba`);
  return parts.join(", ");
}

export function typeLabel({ propertyTypes }: PropertyFilter): string {
  if (!propertyTypes?.length) return "Type";
  const [first, ...rest] = propertyTypes;
  const label = PROPERTY_TYPES.find((t) => t.value === first)?.label ?? first;
  return rest.length ? `${label} +${rest.length}` : label;
}
