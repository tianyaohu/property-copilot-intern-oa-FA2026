"use client";

import dynamic from "next/dynamic";
import type { Property } from "@/lib/types";

export type MapPanelProps = {
  properties: Property[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
};

/**
 * PLACEHOLDER — this is where the map goes, and it is the core of the OA.
 *
 * Replace this component with a real, performant map (Google Maps, Mapbox, or
 * OpenStreetMap/Leaflet — your call, justify it in REPORT.md) that:
 *   - renders a marker for every property at its lat/lng,
 *   - stays smooth with all markers visible (clustering or viewport rendering),
 *   - selects a listing when its marker is clicked, and stays in sync with the
 *     list (the `activeId` / `onSelect` props are wired for you), and
 *   - ideally drives a server-side viewport query as the map pans/zooms.
 *
 * The props you need are already threaded through from the browse page.
 *
 * Implemented with Leaflet + OpenStreetMap via react-leaflet (see MapInner).
 * Leaflet touches `window` at import time, so the real map must never render
 * on the server: next/dynamic with `ssr: false` loads it in the browser only.
 * That option is disallowed in Server Components, which is why this thin
 * client-component wrapper exists at all.
 */
const MapInner = dynamic(() => import("./MapInner").then((mod) => mod.MapInner), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] w-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 lg:h-full">
      <p className="text-sm text-gray-500">Loading map…</p>
    </div>
  )
});

export function MapPanel(props: MapPanelProps) {
  return <MapInner {...props} />;
}
