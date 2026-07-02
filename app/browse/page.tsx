"use client";

import { useEffect, useRef, useState } from "react";
import { fetchProperties } from "@/lib/api";
import type { Property, PropertyFilter } from "@/lib/types";
import { FilterBar } from "@/components/FilterBar";
import { PropertyCard } from "@/components/PropertyCard";
import { MapPanel } from "@/components/MapPanel";

type LoadState = "loading" | "error" | "ready";

// How long the viewport must sit still before we query the server. Debounce
// (not throttle): we want the settled view, not every intermediate frame.
const VIEWPORT_DEBOUNCE_MS = 350;

export default function BrowsePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  // Map viewport as "minLat,minLng,maxLat,maxLng". null until the map mounts
  // and reports its first bounds — nothing is fetched before that, so the map
  // must render regardless of load state (it produces the query, not just
  // displays its result).
  const [bbox, setBbox] = useState<string | null>(null);
  // Active renter filters; composed with the viewport into one server query.
  const [filter, setFilter] = useState<PropertyFilter>({});
  // Refetches (pan/zoom) keep the previous list on screen; this drives a small
  // "Updating…" hint instead of the full-page loading state.
  const [isFetching, setIsFetching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (bbox === null) return;

    // TODO (candidate): pass the active filters and map viewport here so the
    // server returns only what is relevant, instead of every listing.
    // (Done: the map's live bounds and the filter bar's state compose into one
    // server query. Typing in a filter input resets the same debounce timer,
    // so rapid changes coalesce into a single request.)
    const timer = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsFetching(true);

      fetchProperties(filter, { bbox, signal: controller.signal })
        .then((data) => {
          setProperties(data);
          setState("ready");
          setError("");
        })
        .catch((err) => {
          // A request superseded by a newer viewport aborts; not an error.
          if ((err as Error)?.name === "AbortError") return;
          setError(err instanceof Error ? err.message : "Failed to load listings");
          // Only the first load gets the full-page error state; once listings
          // are on screen, keep them and surface the failure inline.
          setState((prev) => (prev === "ready" ? prev : "error"));
        })
        .finally(() => {
          if (abortRef.current === controller) {
            setIsFetching(false);
          }
        });
    }, VIEWPORT_DEBOUNCE_MS);

    // Re-running (new bbox) or unmounting cancels both the pending timer and
    // any in-flight request — the debounce and the stale-request abort in one
    // cleanup.
    return () => {
      window.clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [bbox, filter]);

  // A refetch can pull the selected listing out of view; drop the selection
  // rather than point at a card that no longer exists.
  useEffect(() => {
    if (activeId && !properties.some((property) => property.id === activeId)) {
      setActiveId(null);
    }
  }, [properties, activeId]);

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
        (Done: rent range, bedrooms, bathrooms — the extra dimension — and
        property type; active-filter chips with per-chip clear and Reset all.)
      */}
      <FilterBar filter={filter} onChange={setFilter} />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-3">
          {state === "loading" ? (
            <p className="text-sm text-gray-600">Loading listings…</p>
          ) : null}

          {state === "error" ? (
            <p className="text-sm text-red-700">Could not load listings: {error}</p>
          ) : null}

          {state === "ready" ? (
            <>
              <div className="flex items-baseline justify-between text-sm text-gray-600">
                <span>
                  {properties.length} listing{properties.length === 1 ? "" : "s"} in view
                </span>
                <span
                  aria-live="polite"
                  className={`text-xs ${isFetching ? "text-gray-500" : "invisible"}`}
                >
                  Updating…
                </span>
              </div>

              {error ? (
                <p className="text-sm text-red-700">Could not update listings: {error}</p>
              ) : null}

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
            </>
          ) : null}
        </div>

        <div className="lg:sticky lg:top-4 lg:h-[calc(100vh-6rem)]">
          <MapPanel
            properties={properties}
            activeId={activeId}
            onSelect={setActiveId}
            onBoundsChange={setBbox}
          />
        </div>
      </div>
    </section>
  );
}
