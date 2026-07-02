"use client";

import { useEffect, useState } from "react";
import { fetchProperties } from "@/lib/api";
import type { Property } from "@/lib/types";
import { PropertyCard } from "@/components/PropertyCard";
import { MapPanel } from "@/components/MapPanel";

type LoadState = "loading" | "error" | "ready";

// Metro Vancouver viewport (minLat,minLng,maxLat,maxLng). Placeholder until the
// map reports its live bounds; the API requires a bbox on every request.
const METRO_VANCOUVER_BBOX = "49.0,-123.35,49.45,-122.6";

export default function BrowsePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState("loading");
      try {
        // TODO (candidate): pass the active filters and map viewport here so the
        // server returns only what is relevant, instead of every listing.
        // (Viewport done — static metro bbox until the map reports live bounds;
        // filters land with the filter bar.)
        const data = await fetchProperties({}, { bbox: METRO_VANCOUVER_BBOX });
        if (!cancelled) {
          setProperties(data);
          setState("ready");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load listings");
          setState("error");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Browse rentals</h1>
        <p className="text-sm text-gray-600">
          Metro Vancouver listings. Filters and the map are yours to build.
        </p>
      </div>

      {/*
        TODO (candidate): a filter bar goes here (rent range, bedrooms, property
        type, + one more dimension). Filters should update both the list and the
        map, compose correctly, and be easy to reset.
      */}

      {state === "loading" ? (
        <p className="text-sm text-gray-600">Loading listings…</p>
      ) : null}

      {state === "error" ? (
        <p className="text-sm text-red-700">Could not load listings: {error}</p>
      ) : null}

      {state === "ready" ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-3">
            {properties.length === 0 ? (
              <p className="text-sm text-gray-600">No listings match your search.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {properties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    active={property.id === activeId}
                    onSelect={setActiveId}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-6rem)]">
            <MapPanel properties={properties} activeId={activeId} onSelect={setActiveId} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
