"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import type { MapPanelProps } from "./MapPanel";

// Roughly centers the four seeded cities (Vancouver, Richmond, Burnaby,
// Surrey); zoom 11 keeps all 50 listings in the initial view.
const INITIAL_CENTER: [number, number] = [49.22, -122.99];
const INITIAL_ZOOM = 11;

// Keep the map inside greater Metro Vancouver and above a minimum zoom. This
// is UX (there is nothing to rent in the Pacific) but also bounds the
// geohash-prefix fan-out of the worst viewport a user can request.
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [48.8, -123.6],
  [49.7, -122.2]
];
const MIN_ZOOM = 10;

// The map is the source of truth for "where is the user looking": serialize
// its bounds in the exact shape parseBoundingBox expects (lat first).
function serializeBounds(map: L.Map): string {
  const b = map.getBounds();
  return `${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}`;
}

// Reports the visible bounds upward on mount (so the very first fetch already
// has a real viewport) and after every pan/zoom (moveend also fires at the end
// of a zoom). Rendered inside MapContainer because useMapEvents needs the map
// context.
function ViewportReporter({ onBoundsChange }: Pick<MapPanelProps, "onBoundsChange">) {
  const map = useMapEvents({
    moveend: () => onBoundsChange?.(serializeBounds(map))
  });

  useEffect(() => {
    onBoundsChange?.(serializeBounds(map));
    // Mount-only by design: moveend covers every later change.
  }, []);

  return null;
}

const CAD = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0
});

// Price-pill markers via L.divIcon instead of Leaflet's default pin: the
// default icon resolves its PNG URLs in ways bundlers break (the classic
// missing marker-icon.png), and a rent label carries more information than a
// pin anyway. The 0x0 icon box opts out of Leaflet's anchor math; the pill
// centers itself over the coordinate with CSS transforms.
//
// Icons are cached per (rent, active) so re-renders hand react-leaflet the
// same instance and it skips a needless setIcon on every unchanged marker.
const iconCache = new Map<string, L.DivIcon>();

function priceIcon(rent: number, active: boolean): L.DivIcon {
  const key = `${rent}:${active}`;
  let icon = iconCache.get(key);
  if (!icon) {
    const pill = active
      ? "border-black bg-black text-white"
      : "border-gray-300 bg-white text-gray-900";
    icon = L.divIcon({
      className: "",
      iconSize: [0, 0],
      html: `<div class="inline-block w-max -translate-x-1/2 -translate-y-1/2 cursor-pointer whitespace-nowrap rounded-full border px-2 py-1 text-xs font-semibold shadow ${pill}">${CAD.format(rent)}</div>`
    });
    iconCache.set(key, icon);
  }
  return icon;
}

export function MapInner({ properties, activeId, onSelect, onBoundsChange }: MapPanelProps) {
  return (
    <div className="h-[420px] w-full overflow-hidden rounded-lg border border-gray-200 lg:h-full">
      <MapContainer
        center={INITIAL_CENTER}
        zoom={INITIAL_ZOOM}
        minZoom={MIN_ZOOM}
        maxBounds={MAX_BOUNDS}
        maxBoundsViscosity={1.0}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <ViewportReporter onBoundsChange={onBoundsChange} />
        {properties.map((property) => (
          <Marker
            key={property.id}
            position={[property.lat, property.lng]}
            icon={priceIcon(property.rent, property.id === activeId)}
            zIndexOffset={property.id === activeId ? 1000 : 0}
            eventHandlers={{ click: () => onSelect?.(property.id) }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
