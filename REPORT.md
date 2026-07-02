## Design decisions

Address each of the four ambiguous areas (one to three sentences each):

1. **Map provider** — which provider you chose and the trade-off versus the alternatives.
2. **Performance at density** — how you keep the map smooth with all markers visible (clustering, viewport rendering, etc.) and what you observed.
3. **Geospatial querying** — how the server answers a viewport query without scanning the table, and how you use the geohash index.
   - *Draft:* Viewport box → `ngeohash.bboxes` at prefix length 5 (~4.9 km cells) → one `geo-index` Query per prefix in parallel → dedupe → exact lat/lng refine (prefix cells overhang the box) → attribute filters compose after, reusing the pure `filter.ts` logic.
   - *Draft:* `bbox` is required (400 when missing or malformed), so the GSI is the only read path and request cost is proportional to the viewport. Rejected alternative: defaulting to a metro-wide box (~120-prefix fan-out per request for no user benefit).
   - *Draft:* Verified end-to-end by integration tests against DynamoDB Local (also in CI via a service container), including a fixture that only the exact-box refine excludes. Baseline before: full-table Scan, 50 rows in ~27 ms locally.
4. **Filtering model** — the dimensions you support, how filters compose, and the empty/reset behaviour.

## What I'd add with more time

Describe the highest-value improvements you would make next.
