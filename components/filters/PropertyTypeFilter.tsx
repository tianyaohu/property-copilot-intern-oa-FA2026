"use client";

import type { PropertyType } from "@/lib/types";
import { Checkbox } from "@/components/ui/Checkbox";
import { PROPERTY_TYPES, type FilterBodyProps } from "@/components/filters/filterOptions";

/**
 * Multi-select property-type checklist. Any combination is allowed (Apartment
 * OR Condo); the list is normalized to `undefined` when empty so it reads the
 * same as "no type filter" everywhere downstream.
 *
 * The legend is visually hidden because the dialog title (and the master
 * panel's section title) already say "Property type". Without the group name
 * the four boxes are just "Apartment", "Condo", "House", "Townhouse".
 */
export function PropertyTypeFilter({ filter, onChange }: FilterBodyProps) {
  const selected = filter.propertyTypes ?? [];

  const toggle = (type: PropertyType, checked: boolean) => {
    const next = checked ? [...selected, type] : selected.filter((t) => t !== type);
    onChange({ ...filter, propertyTypes: next.length ? next : undefined });
  };

  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="sr-only">Property type</legend>
      <div className="space-y-2.5">
        {PROPERTY_TYPES.map(({ value, label }) => (
          <Checkbox
            key={value}
            label={label}
            checked={selected.includes(value)}
            onChange={(e) => toggle(value, e.target.checked)}
          />
        ))}
      </div>
    </fieldset>
  );
}
