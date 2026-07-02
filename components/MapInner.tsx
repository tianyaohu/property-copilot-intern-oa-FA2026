"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import type { MapPanelProps } from "./MapPanel";

// Roughly centers the four seeded cities (Vancouver, Richmond, Burnaby,
// Surrey); zoom 11 keeps all 50 listings in the initial view.
const INITIAL_CENTER: [number, number] = [49.22, -122.99];
const INITIAL_ZOOM = 11;

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

export function MapInner({ properties, activeId, onSelect }: MapPanelProps) {
  return (
    <div className="h-[420px] w-full overflow-hidden rounded-lg border border-gray-200 lg:h-full">
      <MapContainer
        center={INITIAL_CENTER}
        zoom={INITIAL_ZOOM}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
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
