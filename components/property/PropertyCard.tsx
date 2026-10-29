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
  /**
   * List cards only. The map popup uses the same tile and must not scroll
   * the page when it opens.
   */
  syncWithList?: boolean;
  /**
   * Changes when the phone swaps map and list. The list is `display: none`
   * while the map is showing, so a scroll started at selection time has no
   * box to move — this key retries once the list is actually on screen.
   */
  layoutKey?: string;
};

/**
 * Reusable listing tile, styled from design tokens. Used in both the list grid
 * and the map popup; the active state (accent ring) marks the selected marker's
 * card.
 */
export function PropertyCard({ property, active, onSelect, syncWithList, layoutKey }: PropertyCardProps) {
  const ref = useRef<HTMLElement>(null);
  const layoutKeyRef = useRef(layoutKey);
  // Set during render when the phone list is being revealed, so the effect
  // centers the already-selected card instead of treating it as a no-op.
  const centerOnShow = useRef(false);
  if (layoutKeyRef.current !== layoutKey) {
    centerOnShow.current = layoutKey === "list";
    layoutKeyRef.current = layoutKey;
  }

  // Map → list sync. "nearest" is a no-op when the card is already visible.
  // Opening the phone list is different: the selection happened while this
  // card was display:none, so the earlier scroll never landed — center it
  // once it has a box. Skipped between `sm` and `lg`: map and list are
  // stacked with no sticky map, and scrolling the page would yank the map
  // the user just clicked off screen. At `lg`+ the map stays sticky.
  useEffect(() => {
    const el = ref.current;
    const laidOut = !!el && el.getClientRects().length > 0;
    if (!syncWithList || !active || !laidOut || !el) {
      // Consume a pending reveal when there is nothing selected to show.
      // Leave it pending while the selected card is still display:none so
      // the next layout (the list opening) can still center it.
      if (!active || laidOut) centerOnShow.current = false;
      return;
    }
    const center = centerOnShow.current;
    centerOnShow.current = false;
    const isStackedNarrow = window.matchMedia("(min-width: 640px) and (max-width: 1023.98px)").matches;
    if (isStackedNarrow) return;
    el.scrollIntoView(
      center
        ? { block: "center", inline: "nearest", behavior: "smooth" }
        : { block: "nearest", behavior: "smooth" }
    );
  }, [syncWithList, active, layoutKey]);

  return (
    <article
      ref={ref}
      className={`overflow-hidden rounded-lg border bg-surface transition ${
        active ? "border-accent ring-1 ring-accent" : "border-border"
      } ${onSelect ? "cursor-pointer hover:border-fg/30" : ""}`}
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
          <p className="font-semibold text-fg">{CAD.format(property.rent)}/mo</p>
          <span className="text-xs uppercase tracking-wide text-muted">
            {property.propertyType}
          </span>
        </div>
        <p className="text-sm text-fg/80">
          {bedroomLabel(property.bedrooms)} · {property.bathrooms} ba · {property.squareFeet} sqft
        </p>
        <p className="truncate text-sm text-muted">
          {property.street}, {property.city}
        </p>
      </div>
    </article>
  );
}
