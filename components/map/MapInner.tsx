"use client";

import { useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MaplibreMap } from "maplibre-gl";
import { Map, Marker, Popup } from "react-map-gl/maplibre";
import { formatCompactRent } from "@/lib/format";
import { PropertyCard } from "@/components/property/PropertyCard";
import type { MapPanelProps } from "./MapPanel";

// Roughly centers the four seeded cities (Vancouver, Richmond, Burnaby,
// Surrey); zoom 11 keeps all 50 listings in the initial view. react-map-gl
// takes longitude/latitude as separate named props (not a [lat, lng] tuple
// like Leaflet) — easy to transpose by mistake.
const INITIAL_VIEW_STATE = { longitude: -122.99, latitude: 49.22, zoom: 11 };

// Below this zoom, price pills collapse into plain circles; the initial
// view (zoom 11) stays in pill mode, matching the default look above.
const CIRCLE_ZOOM_THRESHOLD = 10;

// OpenFreeMap hosts this vector style for free, no API key or billing
// account required.
const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/liberty";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

// The map is the source of truth for "where is the user looking": serialize
// its bounds in the exact shape parseBoundingBox expects (lat first).
// MapLibre's getBounds() does not wrap or clamp — zoomed out past the world,
// or panned across the antimeridian, it returns longitudes beyond ±180 (and
// latitudes beyond ±90), which the server rejects as an invalid bbox. Clamping
// keeps the request valid, so an oversized viewport surfaces as the intended
// "Viewport too large; zoom in" from the fan-out guard instead of a parse
// error. (An antimeridian-crossing view collapses to a wide valid box — an
// acceptable trade-off for a metro-area product.)
function serializeBounds(map: MaplibreMap): string {
  const b = map.getBounds();
  const south = clamp(b.getSouth(), -90, 90);
  const west = clamp(b.getWest(), -180, 180);
  const north = clamp(b.getNorth(), -90, 90);
  const east = clamp(b.getEast(), -180, 180);
  return `${south},${west},${north},${east}`;
}

export function MapInner({ properties, activeId, onSelect, onBoundsChange }: MapPanelProps) {
  const [isCircleZoom, setIsCircleZoom] = useState(INITIAL_VIEW_STATE.zoom < CIRCLE_ZOOM_THRESHOLD);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const activeProperty = properties.find((p) => p.id === activeId);

  return (
    <div className="h-[70vh] w-full overflow-hidden rounded-lg border border-border sm:h-[420px] lg:h-full">
      {/*
        No minZoom/maxBounds: the user can pan and zoom out as far as MapLibre
        allows (the whole world). The server's fan-out guard
        (queryByBoundingBox's MAX_PREFIXES in backend/src/properties.ts) is
        the real limiter now — a viewport too large to query surfaces as the
        "Could not update listings: Viewport too large; zoom in" banner in
        app/browse/page.tsx, not a hard map lock.
      */}
      <Map
        initialViewState={INITIAL_VIEW_STATE}
        mapStyle={MAP_STYLE_URL}
        style={{ width: "100%", height: "100%" }}
        onLoad={(e) => onBoundsChange?.(serializeBounds(e.target))}
        onMoveEnd={(e) => onBoundsChange?.(serializeBounds(e.target))}
        onDragStart={() => onSelect?.(null)}
        onZoom={(e) => {
          // Fires only on zoom gestures, not pure pans, so panning within
          // the same zoom mode doesn't re-render all markers. Only touches
          // state on an actual threshold crossing.
          const circle = e.viewState.zoom < CIRCLE_ZOOM_THRESHOLD;
          setIsCircleZoom((prev) => (prev === circle ? prev : circle));
        }}
      >
        {properties.map((property) => {
          const active = property.id === activeId;
          const hovered = property.id === hoveredId;
          // Full pill size/text whenever at pill-zoom, or whenever hovered
          // (a hovered circle always expands to reveal its price).
          const expanded = !isCircleZoom || hovered;
          // Hovered always wins to the very top; otherwise the selected
          // marker keeps its usual above-the-pack z-index.
          const zIndex = hovered ? 2000 : active ? 1000 : 0;
          // Always the compact "3.3k" label, regardless of zoom mode — the
          // full currency string was too wide for the pill at pill-zoom.
          const priceText = formatCompactRent(property.rent);

          return (
            <Marker
              key={property.id}
              longitude={property.lng}
              latitude={property.lat}
              style={{ zIndex }}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                onSelect?.(property.id);
              }}
            >
              {/*
                Price-pill marker instead of the default pin. Below
                CIRCLE_ZOOM_THRESHOLD it collapses to a plain circle (no
                text) unless hovered. No translate/anchor classes here —
                MapLibre already centers this element on the coordinate via
                a transform that recomputes live against this element's own
                box size, so the width/height transition below stays
                perfectly centered with no extra positioning code.

                Width is animated via max-width (never a fixed width) so it
                can transition smoothly to/from the circle's collapsed size:
                CSS can't smoothly interpolate to/from `width: auto`, but
                max-width against a fixed target can, and actual rendered
                width is always min(content, max-width).
              */}
              <div
                onMouseEnter={() => setHoveredId(property.id)}
                onMouseLeave={() => setHoveredId((current) => (current === property.id ? null : current))}
                className={[
                  "inline-flex cursor-pointer items-center justify-center overflow-hidden",
                  "whitespace-nowrap rounded-full border text-sm font-semibold",
                  "transition-all duration-200 ease-out",
                  expanded ? "h-7 max-w-20 px-2 py-1" : "h-3 max-w-3 px-0 py-0",
                  hovered ? "scale-110 shadow-xl" : "scale-100 shadow",
                  active ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface text-fg"
                ].join(" ")}
              >
                <span className={`transition-opacity duration-200 ${expanded ? "opacity-100" : "opacity-0"}`}>
                  {priceText}
                </span>
              </div>
            </Marker>
          );
        })}
        {activeProperty && (
          // No fixed `anchor`: MapLibre picks the anchor (top/bottom/left/right,
          // or a corner combo) that keeps the popup inside the map's own
          // rendered bounds, flipping it away from whichever edge the pin is
          // near instead of letting it clip against the container's
          // overflow-hidden border.
          <Popup
            longitude={activeProperty.lng}
            latitude={activeProperty.lat}
            offset={20}
            closeButton={false}
            closeOnClick
            onClose={() => onSelect?.(null)}
            className="property-popup"
          >
            <div className="w-64">
              <PropertyCard property={activeProperty} active onSelect={onSelect} />
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
