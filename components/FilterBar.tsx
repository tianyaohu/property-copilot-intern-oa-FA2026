"use client";

import type { PropertyFilter, PropertyType } from "@/lib/types";

const PROPERTY_TYPES: PropertyType[] = ["apartment", "condo", "house", "townhouse"];

const CAD = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0
});

type FilterBarProps = {
  filter: PropertyFilter;
  onChange: (filter: PropertyFilter) => void;
};

/**
 * Controlled filter bar. Owns no state: it renders the PropertyFilter it is
 * given and emits a new one on every change — the page composes it with the
 * map viewport into a single server query, so the list and the map always
 * reflect the same filters.
 */
export function FilterBar({ filter, onChange }: FilterBarProps) {
  const set = (patch: Partial<PropertyFilter>) => onChange({ ...filter, ...patch });

  const numberOrUndefined = (value: string) =>
    value === "" ? undefined : Number(value);

  // One chip per active dimension; each × clears just that dimension.
  const chips: { label: string; clear: () => void }[] = [];
  if (filter.minRent !== undefined) {
    chips.push({ label: `≥ ${CAD.format(filter.minRent)}`, clear: () => set({ minRent: undefined }) });
  }
  if (filter.maxRent !== undefined) {
    chips.push({ label: `≤ ${CAD.format(filter.maxRent)}`, clear: () => set({ maxRent: undefined }) });
  }
  if (filter.bedrooms !== undefined) {
    chips.push({ label: `${filter.bedrooms}+ bd`, clear: () => set({ bedrooms: undefined }) });
  }
  if (filter.bathrooms !== undefined) {
    chips.push({ label: `${filter.bathrooms}+ ba`, clear: () => set({ bathrooms: undefined }) });
  }
  if (filter.propertyType !== undefined) {
    chips.push({ label: filter.propertyType, clear: () => set({ propertyType: undefined }) });
  }

  const labelClass = "flex flex-col gap-1 text-xs font-medium text-gray-600";
  const inputClass =
    "h-9 w-28 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 focus:border-black focus:outline-none";

  return (
    <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className={labelClass}>
          Min rent
          <input
            type="number"
            min={0}
            step={100}
            placeholder="Any"
            value={filter.minRent ?? ""}
            onChange={(e) => set({ minRent: numberOrUndefined(e.target.value) })}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          Max rent
          <input
            type="number"
            min={0}
            step={100}
            placeholder="Any"
            value={filter.maxRent ?? ""}
            onChange={(e) => set({ maxRent: numberOrUndefined(e.target.value) })}
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          Bedrooms
          <select
            value={filter.bedrooms ?? ""}
            onChange={(e) => set({ bedrooms: numberOrUndefined(e.target.value) })}
            className={inputClass}
          >
            <option value="">Any</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
          </select>
        </label>

        <label className={labelClass}>
          Bathrooms
          <select
            value={filter.bathrooms ?? ""}
            onChange={(e) => set({ bathrooms: numberOrUndefined(e.target.value) })}
            className={inputClass}
          >
            <option value="">Any</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
          </select>
        </label>

        <label className={labelClass}>
          Type
          <select
            value={filter.propertyType ?? ""}
            onChange={(e) =>
              set({
                propertyType:
                  e.target.value === "" ? undefined : (e.target.value as PropertyType)
              })
            }
            className={inputClass}
          >
            <option value="">Any</option>
            {PROPERTY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        {chips.length > 0 ? (
          <button
            type="button"
            onClick={() => onChange({})}
            className="h-9 rounded-md border border-gray-300 px-3 text-sm text-gray-700 hover:border-gray-400"
          >
            Reset all
          </button>
        ) : null}
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <span
              key={chip.label}
              className="inline-flex items-center gap-1 rounded-full bg-gray-900 py-1 pl-3 pr-1 text-xs font-medium text-white"
            >
              {chip.label}
              <button
                type="button"
                aria-label={`Clear ${chip.label}`}
                onClick={chip.clear}
                className="rounded-full px-1.5 py-0.5 hover:bg-gray-700"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
