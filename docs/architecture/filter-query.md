# Listings filter query

The query string on `GET /properties` is a contract. The browse page builds
it, and the API parses it. Those two sides used to meet inside the Lambda
filter module.

## Before

`backend/src/filter.ts` owned every stage of a filter in one registry:
raw-syntax check, parse, domain validation, match predicate, and serialize.
That kept a new dimension to a single entry, and it is why `bedrooms=0` can
stay a number while the studio rule lives only in the predicate.

The cost was the dependency direction. `lib/propertiesQuery.ts` imported
`serializeFilter` from `@/backend/src/filter` so the browser client could
build the same query. The client did not call the predicates, but its module
graph rooted in the server module that holds them, including the studio
match and the API's domain-error strings. A server-only import added to that
file would have shipped to the Next.js bundle, or broken the client build.

Success and error JSON were already a shared contract (`shared/contract.ts`).
The query string was not.

## After

`shared/filterQuery.ts` owns the wire codec:

- the numeric param list `minRent`, `maxRent`, `bedrooms`, `bathrooms`
- parse and serialize, which walk that list so they stay inverses
- `filterQuerySyntaxError`, the "present but not a finite number" check, in
  that same order

`bedroomsExact` and `propertyType` sit beside the list. They are not numbers:
exactness is the literal `true`, and an unknown property type is dropped
rather than rejected. Blank numeric params stay "no constraint". `bedrooms=0`
is still serialized and parsed as `{ bedrooms: 0 }` with no invented
`bedroomsExact`. The studio predicate is unchanged and still lives in
`backend/src/filter.ts`.

The API module re-exports `parseFilter`, `serializeFilter`, and
`filterQuerySyntaxError` (as `validateFilterQuery`). They are the same
function references, not a second copy. `lib/propertiesQuery.ts` imports
`serializeFilter` from the shared codec. `app/`, `components/`, and `lib/`
do not import `backend/`.

Domain validation (`validateFilter`: negative bounds, inverted rent, a NaN
handed in as a number) and every match predicate stay in the backend
registry, in the same order as before. `parsePropertiesQuery` still runs
syntax, then parse, then domain validation, and still does not rewrite
studio into `bedroomsExact`.

## Why this shape

Moving the whole registry into `shared/` would have put match policy in the
client bundle and dragged the studio rule across the boundary. Leaving a
second serializer in the client, locked only by deep equality, would have
been two owners again. The numeric list plus a re-export identity test is
the smaller seam: one codec, predicates left where bug-fixes for matching
already live.

## Left out

1. **Domain-error copy on the client.** `validateFilter` messages stay on
   the server. Rent already shares the accept/reject decision
   (`rentRangeIssue`) while the UI and the API keep different sentences.
   Bedrooms and bathrooms have no client copy of those messages today.
   Preflighting them in the price and rooms popovers would be a separate
   change, and it would touch the filter UI.

2. **Match predicates in the shared codec.** `filterProperties`, including
   the studio exact-match rule, stays server-side. The UI does not filter
   listings locally. Moving it would undo the boundary this change draws.

3. **The error envelope.** Routes still build `{ error: string }` inline, and
   `apiGet` still reads `body.error` without a shared parser. That is the
   next contract seam. It was left alone because the router and the detail
   client were just tightened for id decoding and non-finite params, and
   this change stops at the query string.

Bbox serialization (`lib/mapBounds.ts` and `backend/src/geo.ts`) was not
touched. Antimeridian handling stays where it is.
