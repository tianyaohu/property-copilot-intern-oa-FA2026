"use client";

import { useEffect, useRef, useState } from "react";
import { loadProperties } from "@/lib/propertiesQuery";
import type { Property, PropertyFilter } from "@/lib/types";
import { FilterBar } from "@/components/filters/FilterBar";
import { countActiveFilters } from "@/components/filters/filterOptions";
import { PropertyCard } from "@/components/property/PropertyCard";
import { MapPanel } from "@/components/map/MapPanel";
import { MobileViewToggle } from "@/components/map/MobileViewToggle";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PropertyCardSkeleton } from "@/components/ui/Skeleton";

type LoadState = "loading" | "error" | "ready";

// How long the viewport must sit still before we query the server. Debounce
// (not throttle): we want the settled view, not every intermediate frame.
const VIEWPORT_DEBOUNCE_MS = 350;

export default function BrowsePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  // Map viewport as "minLat,minLng,maxLat,maxLng". null until the map mounts
  // and reports its first bounds — nothing is fetched before that, so the map
  // must render regardless of load state (it produces the query, not just
  // displays its result).
  const [bbox, setBbox] = useState<string | null>(null);
  // Active renter filters; composed with the viewport into one server query.
  const [filter, setFilter] = useState<PropertyFilter>({});
  // True when the server clipped the response to its result cap; drives a
  // "zoom in to see all" hint next to the listing count.
  const [truncated, setTruncated] = useState(false);
  // Refetches (pan/zoom) keep the previous list on screen; this drives a small
  // "Updating…" hint instead of the full-page loading state.
  const [isFetching, setIsFetching] = useState(false);
  // Bumps on "Try again" so a failed load can be repeated without a pan or a
  // filter change — those are otherwise the only effect dependencies.
  const [reloadKey, setReloadKey] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (bbox === null) return;

    // The map's live bounds and the filter bar's state compose into one server
    // query. Typing in a filter input resets the same debounce timer, so rapid
    // changes coalesce into a single request.
    const timer = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsFetching(true);

      // Query string, the missing-viewport skip, abort, and error text live in
      // loadProperties. This effect only debounces and maps the result onto
      // view state.
      loadProperties({ filter, bbox, signal: controller.signal })
        .then((result) => {
          if (
            controller.signal.aborted ||
            result.status === "aborted" ||
            result.status === "cancelled"
          ) {
            return;
          }
          if (result.status === "error") {
            setError(result.message);
            // Only the first load gets the full-page error state; once listings
            // are on screen, keep them and surface the failure inline.
            setState((prev) => (prev === "ready" ? prev : "error"));
            return;
          }
          setProperties(result.properties);
          setTruncated(result.truncated);
          setState("ready");
          setError("");
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
  }, [bbox, filter, reloadKey]);

  // A refetch can pull the selected listing out of view; drop the selection
  // rather than point at a card that no longer exists.
  useEffect(() => {
    if (activeId && !properties.some((property) => property.id === activeId)) {
      setActiveId(null);
    }
  }, [properties, activeId]);

  const hasActiveFilters = countActiveFilters(filter) > 0;
  const retry = () => setReloadKey((key) => key + 1);

  // The fixed map/list bar occupies the bottom edge below `sm`. This padding
  // is its height (44px targets + inset, including the home indicator) so the
  // last card can scroll above it. Removed at `sm`, where the bar hides.
  return (
    <section className="space-y-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:pb-0">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Browse rentals</h1>
        <p className="text-sm text-muted">
          Rental listings across Metro Vancouver. Pan the map or adjust the
          filters — the list and map always show the same results.
        </p>
      </div>

      {/*
        Every filter is a FilterMenu (the master "Filters" chip too) and applies
        instantly. All write to the same filter state, so every surface agrees.
        Sticky (bg-bg masks the list scrolling under it) so filters stay
        reachable while the listing column scrolls; the map column pins below it.
      */}
      <div className="sticky top-0 z-20 bg-bg py-2">
        <FilterBar filter={filter} onChange={setFilter} />
      </div>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_1.2fr]">
        {/*
          On a phone the list pane is `hidden` while the map is showing, so
          status has to sit outside it — otherwise the load error, the result
          cap, and Try again never appear on the default map view. `order-first`
          keeps that block above the map. From `lg` it stays in the list column
          and the map keeps the first grid row, so the count does not push the
          map down.
        */}
        {state === "error" || state === "ready" ? (
          <div className="order-first space-y-2 lg:col-start-1">
            {state === "error" ? (
              // Compact on purpose: the tall empty-state padding pushed the
              // phone map back under the Map/List bar.
              <div className="rounded-lg border border-dashed border-border bg-surface px-4 py-3 text-center">
                <p className="text-sm font-semibold text-fg">Couldn't load listings</p>
                <p className="mt-1 text-sm text-muted">{error}</p>
                <div className="mt-2">
                  <Button variant="ghost" size="sm" onClick={retry}>
                    Try again
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-baseline justify-between text-sm text-muted">
                  <span>
                    {properties.length} listing{properties.length === 1 ? "" : "s"} in view
                    {truncated ? <span className="text-muted"> — zoom in to see all</span> : null}
                  </span>
                  <span
                    aria-live="polite"
                    className={`text-xs ${isFetching ? "text-muted" : "invisible"}`}
                  >
                    Updating…
                  </span>
                </div>
                {error ? (
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-danger">
                    <span>Could not update listings: {error}</span>
                    <Button variant="link" size="sm" onClick={retry}>
                      Try again
                    </Button>
                  </p>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        <div className={`space-y-3 order-2 lg:order-none lg:col-start-1 ${mobileView === "list" ? "" : "hidden"} sm:block`}>
          {state === "loading" ? (
            <div className="grid gap-3 sm:grid-cols-2" aria-busy="true" aria-label="Loading listings">
              {Array.from({ length: 6 }, (_, i) => (
                <PropertyCardSkeleton key={i} />
              ))}
            </div>
          ) : null}

          {state === "ready" ? (
            <>
              {properties.length === 0 ? (
                <EmptyState
                  title="No listings match your search"
                  description={
                    hasActiveFilters
                      ? "Try widening your filters or panning the map."
                      : "Pan or zoom the map to explore other areas."
                  }
                  action={
                    hasActiveFilters ? (
                      <Button variant="ghost" size="sm" onClick={() => setFilter({})}>
                        Clear all filters
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {properties.map((property) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      active={property.id === activeId}
                      onSelect={setActiveId}
                      syncWithList
                      layoutKey={mobileView}
                    />
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>

        <div className={`order-1 lg:order-none lg:col-start-2 lg:row-span-2 lg:row-start-1 ${mobileView === "map" ? "" : "hidden"} sm:block lg:sticky lg:top-16 lg:h-[calc(100vh-6rem)]`}>
          <MapPanel
            properties={properties}
            activeId={activeId}
            onSelect={setActiveId}
            onBoundsChange={setBbox}
          />
        </div>
      </div>

      <MobileViewToggle value={mobileView} onChange={setMobileView} />
    </section>
  );
}
