"use client";

import type { PropertyFilter } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { FilterMenu } from "@/components/filters/FilterMenu";
import { AllFiltersPanel } from "@/components/filters/AllFiltersPanel";
import { PriceFilter } from "@/components/filters/PriceFilter";
import { RoomsFilter } from "@/components/filters/RoomsFilter";
import { PropertyTypeFilter } from "@/components/filters/PropertyTypeFilter";
import {
  countActiveFilters,
  priceLabel,
  roomsLabel,
  typeLabel
} from "@/components/filters/filterOptions";

type FilterBarProps = {
  filter: PropertyFilter;
  onChange: (filter: PropertyFilter) => void;
};

/**
 * Controlled filter surface. Owns no filter state — every menu reads `filter`
 * and writes back through `onChange`, so all surfaces agree. Each chip is a
 * FilterMenu (the master "Filters" chip too); every change applies instantly.
 * Filters clear two ways: the inline ✕ on an active chip removes just that
 * dimension, and the trailing "Clear all" wipes everything.
 */
export function FilterBar({ filter, onChange }: FilterBarProps) {
  const activeCount = countActiveFilters(filter);
  const hasPrice = filter.minRent !== undefined || filter.maxRent !== undefined;
  const hasRooms = filter.bedrooms !== undefined || filter.bathrooms !== undefined;
  const hasTypes = (filter.propertyTypes?.length ?? 0) > 0;

  const clearPrice = () => onChange({ ...filter, minRent: undefined, maxRent: undefined });
  const clearRooms = () =>
    onChange({ ...filter, bedrooms: undefined, bedroomsExact: undefined, bathrooms: undefined });
  const clearTypes = () => onChange({ ...filter, propertyTypes: undefined });
  const clearAll = () => onChange({});

  return (
    <div className="flex items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <FilterMenu
        label={
          <span className="inline-flex items-center gap-1.5">
            Filters
            {activeCount > 0 ? <Badge>{activeCount}</Badge> : null}
          </span>
        }
        title="Filters"
        active={activeCount > 0}
        width={360}
        onClear={clearAll}
        clearLabel="Clear all"
        chipClearable={false}
      >
        <AllFiltersPanel filter={filter} onChange={onChange} />
      </FilterMenu>

      <FilterMenu label={priceLabel(filter)} title="Price range" active={hasPrice} onClear={clearPrice}>
        <PriceFilter filter={filter} onChange={onChange} />
      </FilterMenu>

      <FilterMenu
        label={roomsLabel(filter)}
        title="Bedrooms & bathrooms"
        active={hasRooms}
        width={384}
        onClear={clearRooms}
      >
        <RoomsFilter filter={filter} onChange={onChange} />
      </FilterMenu>

      <FilterMenu label={typeLabel(filter)} title="Property type" active={hasTypes} onClear={clearTypes}>
        <PropertyTypeFilter filter={filter} onChange={onChange} />
      </FilterMenu>

      {activeCount > 0 ? (
        <button
          type="button"
          onClick={clearAll}
          className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-muted underline underline-offset-2 transition-colors hover:text-fg"
        >
          Clear all
        </button>
      ) : null}
    </div>
  );
}
