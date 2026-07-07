"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MaplibreMap } from "maplibre-gl";
import { Map, Marker } from "react-map-gl/maplibre";
import type { MapPanelProps } from "./MapPanel";

// Roughly centers the four seeded cities (Vancouver, Richmond, Burnaby,
// Surrey); zoom 11 keeps all 50 listings in the initial view. react-map-gl
// takes longitude/latitude as separate named props (not a [lat, lng] tuple
// like Leaflet) — easy to transpose by mistake.
const INITIAL_VIEW_STATE = { longitude: -122.99, latitude: 49.22, zoom: 11 };

// OpenFreeMap hosts this vector style for free, no API key or billing
// account required.
const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/liberty";

// The map is the source of truth for "where is the user looking": serialize
// its bounds in the exact shape parseBoundingBox expects (lat first).
function serializeBounds(map: MaplibreMap): string {
  const b = map.getBounds();
  return `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;
}

const CAD = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0
});

export function MapInner({ properties, activeId, onSelect, onBoundsChange }: MapPanelProps) {
  return (
    <div className="h-[420px] w-full overflow-hidden rounded-lg border border-gray-200 lg:h-full">
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
      >
        {properties.map((property) => {
          const active = property.id === activeId;
          return (
            <Marker
              key={property.id}
              longitude={property.lng}
              latitude={property.lat}
              style={{ zIndex: active ? 1000 : 0 }}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                onSelect?.(property.id);
              }}
            >
              {/*
                Price-pill marker instead of the default pin: a rent label
                carries more information than a pin. No translate/anchor
                classes here — MapLibre's Marker already centers this element
                on the coordinate; adding one on top would double-center it.
              */}
              <div
                className={`inline-block w-max cursor-pointer whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-semibold shadow ${
                  active
                    ? "border-black bg-black text-white"
                    : "border-gray-300 bg-white text-gray-900"
                }`}
              >
                {CAD.format(property.rent)}
              </div>
            </Marker>
          );
        })}
      </Map>
    </div>
  );
}
