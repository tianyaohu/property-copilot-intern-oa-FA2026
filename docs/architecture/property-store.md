# Listings store

`queryByBoundingBox` used to build DynamoDB commands. Partition pagination, the fan-out guard, id dedupe, and the exact-box refine were one function, so the `LastEvaluatedKey` loop could not be run without a partition larger than 1 MB.

`backend/src/property-store.ts` owns persistence.

- `PropertyTable.queryPage` is one round trip: a `Get`, a `Put`, or a single `Query` against `geo-index`. `createDynamoPropertyStore` is the only code that imports those commands. It reads `PROPERTIES_TABLE` and the document client when the command is sent.
- `PropertyStore.readPartition` asks that table for every item in one cell. A 1 MB page is a DynamoDB limit, so the loop lives here rather than in the viewport query. `continuation` drops a missing or empty cursor; an empty `LastEvaluatedKey` must not issue another query.

`backend/src/properties.ts` owns the viewport. `queryByBoundingBox` estimates the fan-out, throws `ViewportTooLargeError` before any read, enumerates prefixes, calls `readPartition` for each in parallel, dedupes by id, and refines to the exact box. It never sees a cursor. `putProperty` derives `geohash` and `geohashPrefix`, then `put`s the item. The store does not invent index keys.

`getPropertyById`, `putProperty`, and `queryByBoundingBox` take an optional `PropertyStore`. The Lambda and the local server omit it. Rows read back are still trusted as `Property`; this boundary does not add a second validator. The 200-item cap stays in `search.ts`, after attribute filters.
