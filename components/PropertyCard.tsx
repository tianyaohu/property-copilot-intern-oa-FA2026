"use client";

import { useEffect, useRef } from "react";
import { CAD } from "@/lib/format";
import type { Property } from "@/lib/types";

function bedroomLabel(bedrooms: number): string {
  return bedrooms === 0 ? "Studio" : `${bedrooms} bd`;
}

type PropertyCardProps = {
  property: Property;
  active?: boolean;
  onSelect?: (id: string | null) => void;
};

/**
 * Reusable listing tile. Intentionally plain — the design language is yours to
 * define. Reuse this (and add more small components like badges/buttons) across
 * the list and any detail view rather than duplicating markup.
 */
export function PropertyCard({ property, active, onSelect }: PropertyCardProps) {
  const ref = useRef<HTMLElement>(null);

  // Map → list sync: when this card becomes active (its marker was clicked),
  // bring it into view. "nearest" makes it a no-op if already visible.
  // Skipped between `sm` and `lg`: at that width, map and list are stacked
  // in one column with no sticky map (that only starts at `lg`), so
  // scrolling to the card yanks the map the user just clicked clean off
  // screen. Below `sm` the list is hidden while map view is active (nothing
  // visible to scroll to); at `lg`+ the sticky map stays in view beside the
  // list, so the scroll there is harmless.
  useEffect(() => {
    if (!active) return;
    const isStackedNarrow = window.matchMedia("(min-width: 640px) and (max-width: 1023.98px)").matches;
    if (isStackedNarrow) return;
    ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active]);

  return (
    <article
      ref={ref}
      className={`overflow-hidden rounded-lg border bg-white transition ${
        active ? "border-black ring-1 ring-black" : "border-gray-200"
      } ${onSelect ? "cursor-pointer hover:border-gray-400" : ""}`}
      onClick={onSelect ? () => onSelect(property.id) : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={property.images[0]}
        alt={property.title}
        className="h-40 w-full object-cover"
        loading="lazy"
      />
      <div className="space-y-1 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-semibold">{CAD.format(property.rent)}/mo</p>
          <span className="text-xs uppercase tracking-wide text-gray-500">
            {property.propertyType}
          </span>
        </div>
        <p className="text-sm text-gray-700">
          {bedroomLabel(property.bedrooms)} · {property.bathrooms} ba · {property.squareFeet} sqft
        </p>
        <p className="truncate text-sm text-gray-600">
          {property.street}, {property.city}
        </p>
      </div>
    </article>
  );
}
