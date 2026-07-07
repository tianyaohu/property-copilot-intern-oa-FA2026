"use client";

import { useRef, useState } from "react";
import { CAD } from "@/lib/format";
import type { PropertyFilter, PropertyType } from "@/lib/types";
import { FiltersModal } from "@/components/FiltersModal";
import { PriceFilterPopover } from "@/components/PriceFilterPopover";
import { RoomsFilterPopover } from "@/components/RoomsFilterPopover";

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "apartment", label: "Apartment" },
  { value: "condo", label: "Condo" },
  { value: "house", label: "House" },
  { value: "townhouse", label: "Townhouse" }
];

type FilterPillBarProps = {
  filter: PropertyFilter;
  onChange: (filter: PropertyFilter) => void;
};

type OpenPanel = "price" | "rooms" | "filters" | null;

function pillClass(active: boolean): string {
  return `shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-semibold shadow ${
    active
      ? "border-black bg-black text-white"
      : "border-gray-300 bg-white text-gray-900 hover:border-gray-400"
  }`;
}

function priceLabel({ minRent, maxRent }: PropertyFilter): string {
  if (minRent === undefined && maxRent === undefined) return "Price";
  if (minRent !== undefined && maxRent !== undefined) {
    return `${CAD.format(minRent)} – ${CAD.format(maxRent)}`;
  }
  return minRent !== undefined ? `${CAD.format(minRent)}+` : `Up to ${CAD.format(maxRent as number)}`;
}

function roomsLabel({ bedrooms, bedroomsExact, bathrooms }: PropertyFilter): string {
  if (bedrooms === undefined && bathrooms === undefined) return "Beds & baths";
  const parts: string[] = [];
  if (bedrooms !== undefined) {
    // "at least studio" is every listing, so never show it as a minimum;
    // an exact-match studio is still worth surfacing on its own.
    const bedroomLabel = bedrooms === 0 ? "Studio" : bedroomsExact ? `${bedrooms}` : `${bedrooms}+`;
    parts.push(`${bedroomLabel} bd`);
  }
  if (bathrooms !== undefined) parts.push(`${bathrooms}+ ba`);
  return parts.join(", ");
}

/**
 * Controlled pill-bar filter surface. Owns no filter state itself — filter/
 * onChange is the single source of truth, shared with every panel below, so
 * they always agree. Property-type pills write straight through onChange,
 * instantly. "Price" and "Bd/Ba" each open their own small quick-access
 * popover (rent range only / rooms only); "Filters" opens the master panel
 * that bundles every dimension together. Only one panel is open at a
 * time — opening any one closes whichever else was open — and whichever
 * pill opened it gets focus back when it closes.
 */
export function FilterPillBar({ filter, onChange }: FilterPillBarProps) {
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const priceTriggerRef = useRef<HTMLButtonElement | null>(null);
  const roomsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const filtersTriggerRef = useRef<HTMLButtonElement | null>(null);

  const activeCount = Object.values(filter).filter((value) => value !== undefined).length;
  const hasPriceFilter = filter.minRent !== undefined || filter.maxRent !== undefined;
  const hasRoomsFilter = filter.bedrooms !== undefined || filter.bathrooms !== undefined;

  const toggleType = (type: PropertyType) => {
    onChange({ ...filter, propertyType: filter.propertyType === type ? undefined : type });
  };

  const openPanelWith = (panel: Exclude<OpenPanel, null>) => () => setOpenPanel(panel);

  const closePanel = () => {
    const trigger =
      openPanel === "price"
        ? priceTriggerRef.current
        : openPanel === "rooms"
          ? roomsTriggerRef.current
          : openPanel === "filters"
            ? filtersTriggerRef.current
            : null;
    setOpenPanel(null);
    trigger?.focus();
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button
        type="button"
        ref={filtersTriggerRef}
        aria-haspopup="dialog"
        aria-expanded={openPanel === "filters"}
        onClick={openPanelWith("filters")}
        className={`inline-flex items-center gap-1.5 ${pillClass(activeCount > 0)}`}
      >
        Filters
        {activeCount > 0 ? (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-black">
            {activeCount}
          </span>
        ) : null}
      </button>

      <button
        type="button"
        ref={priceTriggerRef}
        aria-haspopup="dialog"
        aria-expanded={openPanel === "price"}
        aria-pressed={hasPriceFilter}
        onClick={openPanelWith("price")}
        className={pillClass(hasPriceFilter)}
      >
        {priceLabel(filter)}
      </button>

      <button
        type="button"
        ref={roomsTriggerRef}
        aria-haspopup="dialog"
        aria-expanded={openPanel === "rooms"}
        aria-pressed={hasRoomsFilter}
        onClick={openPanelWith("rooms")}
        className={pillClass(hasRoomsFilter)}
      >
        {roomsLabel(filter)}
      </button>

      {PROPERTY_TYPES.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={filter.propertyType === value}
          onClick={() => toggleType(value)}
          className={pillClass(filter.propertyType === value)}
        >
          {label}
        </button>
      ))}

      {openPanel === "price" ? (
        <PriceFilterPopover
          minRent={filter.minRent}
          maxRent={filter.maxRent}
          onApply={(patch) => onChange({ ...filter, ...patch })}
          onClose={closePanel}
          triggerRef={priceTriggerRef}
        />
      ) : null}

      {openPanel === "rooms" ? (
        <RoomsFilterPopover
          bedrooms={filter.bedrooms}
          bedroomsExact={filter.bedroomsExact}
          bathrooms={filter.bathrooms}
          onApply={(patch) => onChange({ ...filter, ...patch })}
          onClose={closePanel}
          triggerRef={roomsTriggerRef}
        />
      ) : null}

      {openPanel === "filters" ? (
        <FiltersModal filter={filter} onApply={onChange} onClose={closePanel} />
      ) : null}
    </div>
  );
}
