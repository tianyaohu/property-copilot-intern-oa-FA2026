## Design decisions

Address each of the four ambiguous areas (one to three sentences each):

1. **Map provider** — which provider you chose and the trade-off versus the alternatives.
   - *Draft:* MapLibre GL via react-map-gl, styled with OpenFreeMap's free `liberty` vector style: no API key or billing account (same no-key lineage as the OSM/Leaflet option in the brief — Google/Mapbox both need one, with domain-restriction setup for the deployed URL). <!-- TODO(you): replace this line with your actual reason for moving off the original Leaflet+raster-OSM choice — e.g. smoother WebGL pan/zoom at scale, wanting a declarative React marker API, or a forward-looking bet on listing volume growing past the 50-item seed. -->
   - *Draft:* Markers are declarative `<Marker>` JSX children (a styled `<div>` price pill) rather than `L.divIcon` HTML strings: React re-renders the JSX when `rent`/`active` change, so the manual icon cache Leaflet needed to avoid DOM churn is no longer necessary.
2. **Performance at density** — how you keep the map smooth with all markers visible (clustering, viewport rendering, etc.) and what you observed.
   - *Draft:* Considered clustering and declined it at n=50: fifty declaratively-rendered marker pills are trivial for the DOM (pan/zoom stays smooth with all markers visible), and cluster bubbles would hide the "every marker visible" behaviour the product wants. Threshold: at ~300+ overlapping markers I'd add clustering or canvas/GeoJSON-layer rendering; viewport-driven fetching already bounds what renders.
   - *Draft:* The measured bottleneck was the server, not the map: the initial metro view fans out to 104 geo-index partitions, and at 256 MB the Lambda spent 0.9–1.5 s in-function dispatching those Queries (CPU-bound TLS + signing — the same query is 7 ms for a 4-partition downtown view). Raising the Lambda to 1024 MB (CPU scales with memory) cut it to 0.2–0.33 s, ~0.35–0.5 s end-to-end warm.
   - *Draft:* Guards sized from measurement: a realistic full-Metro-Vancouver viewport estimates to ~726 partitions, comfortably inside the 800 cap. The map itself no longer caps how far a user can zoom out, so a genuinely world-scale request is expected and intended to hit this guard — surfacing as "Viewport too large; zoom in" rather than being pre-emptively blocked by map bounds. The estimate runs *before* cell enumeration, since a world-scale box would otherwise allocate ~33M strings; per-partition pagination and a 200-item `truncated` cap protect correctness and payload size at real data volumes.
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
