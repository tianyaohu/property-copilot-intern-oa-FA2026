## Design decisions

Address each of the four ambiguous areas (one to three sentences each):

1. **Map provider** — which provider you chose and the trade-off versus the alternatives.
   - *Draft:* Leaflet + OpenStreetMap via react-leaflet@5: no API key or billing account (Google/Mapbox both need one, with domain-restriction setup for the deployed URL), mature docs, and DOM markers are more than enough at this density. Trade-off vs MapLibre GL: WebGL vector tiles pan smoother at thousands of markers, but cost a ~3× larger bundle and a tile-source decision — unjustified at 50 listings.
   - *Draft:* Markers are `L.divIcon` price pills rather than the default pin: sidesteps Leaflet's classic bundler-broken default-icon PNGs and shows rent at a glance; icons cached per (rent, active) so re-renders don't churn the DOM.
2. **Performance at density** — how you keep the map smooth with all markers visible (clustering, viewport rendering, etc.) and what you observed.
3. **Geospatial querying** — how the server answers a viewport query without scanning the table, and how you use the geohash index.
   - *Draft:* Viewport box → `ngeohash.bboxes` at prefix length 5 (~4.9 km cells) → one `geo-index` Query per prefix in parallel → dedupe → exact lat/lng refine (prefix cells overhang the box) → attribute filters compose after, reusing the pure `filter.ts` logic.
   - *Draft:* `bbox` is required (400 when missing or malformed), so the GSI is the only read path and request cost is proportional to the viewport. Rejected alternative: defaulting to a metro-wide box (~120-prefix fan-out per request for no user benefit).
   - *Draft:* Verified end-to-end by integration tests against DynamoDB Local (also in CI via a service container), including a fixture that only the exact-box refine excludes. Baseline before: full-table Scan, 50 rows in ~27 ms locally.
4. **Filtering model** — the dimensions you support, how filters compose, and the empty/reset behaviour.
   - *Draft:* Five dimensions — rent range (inclusive), minimum bedrooms, minimum bathrooms (the extra dimension), property type — all parsed and applied server-side by the same pure `filter.ts` used everywhere; they AND together after the geospatial query, so one request answers viewport + filters and the map and list can never disagree.
   - *Draft:* Filtering happens in app code post-refine rather than a DynamoDB `FilterExpression`: Query pricing is per item read, not returned, so pushing predicates down saves only network transfer on a candidate set that is already viewport-sized — while app-side keeps the logic pure, shared, and unit-testable.
   - *Draft:* Active filters render as chips (per-chip clear) with a Reset-all; empty results keep the map interactive and show the empty state in the list; typing shares the viewport debounce, so rapid changes coalesce into one request.

## What I'd add with more time

Describe the highest-value improvements you would make next.
