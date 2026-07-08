"use client";

import type { PropertyFilter } from "@/lib/types";
import { Segmented } from "@/components/ui/Segmented";
import { Checkbox } from "@/components/ui/Checkbox";
import { BATHROOM_OPTIONS, BEDROOM_OPTIONS, type FilterBodyProps } from "@/components/filters/filterOptions";

/**
 * Bedrooms (Studio/1/2/3/4/5) with an exact-match toggle — unchecked means "at
 * least N", checked means "exactly N"; clicking the selected value again clears
 * it. Bathrooms is minimum-only. Every change applies instantly — a room click
 * can't produce an invalid state, so there is nothing to stage or validate.
 */
export function RoomsFilter({ filter, onChange }: FilterBodyProps) {
  const set = (patch: Partial<PropertyFilter>) => onChange({ ...filter, ...patch });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted">Bedrooms</p>
        <Segmented
          ariaLabel="Bedrooms"
          options={BEDROOM_OPTIONS}
          value={filter.bedrooms}
          onChange={(value) => set({ bedrooms: filter.bedrooms === value ? undefined : value })}
        />
        <Checkbox
          label="Use exact match"
          checked={filter.bedroomsExact ?? false}
          onChange={(e) => set({ bedroomsExact: e.target.checked || undefined })}
        />
      </div>
      <div className="space-y-2 border-t border-border pt-4">
        <p className="text-xs font-medium text-muted">Bathrooms</p>
        <Segmented
          ariaLabel="Bathrooms"
          options={BATHROOM_OPTIONS}
          value={filter.bathrooms}
          onChange={(value) => set({ bathrooms: value })}
        />
      </div>
    </div>
  );
}
