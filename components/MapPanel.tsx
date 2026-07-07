"use client";

import dynamic from "next/dynamic";
import type { Property } from "@/lib/types";

export type MapPanelProps = {
  properties: Property[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
  /** Called with "minLat,minLng,maxLat,maxLng" on mount and after every pan/zoom. */
  onBoundsChange?: (bbox: string) => void;
};

/**
 * Map panel: MapLibre GL via react-map-gl (see MapInner), styled with
 * OpenFreeMap's free, keyless vector tiles. Constructing a MapLibre map
 * creates a WebGL canvas and touches browser-only APIs that don't exist
 * during server rendering, so the real map must never render on the server:
 * next/dynamic with `ssr: false` loads it in the browser only. That option is
 * disallowed in Server Components, which is why this thin client-component
 * wrapper exists at all.
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
