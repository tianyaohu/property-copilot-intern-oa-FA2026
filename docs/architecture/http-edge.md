# HTTP edge

The Lambda handler and the local server are adapters. Each one turns its transport payload into an `ApiRequest`, then calls `handleApiRequest`. CORS, JSON, the OPTIONS preflight, and the 500 for an escaped exception live in that function.

## Request

`apiRequestFromHttpApi` reads an API Gateway HTTP API payload (format 2.0): `rawPath`, `queryStringParameters`, and the method. `apiRequestFromNode` reads Node's `req.url`.

The path is the raw origin-form path. It is not `URL.pathname`. That getter resolves dot segments and treats `//properties` as a host, so `/properties/../health` would be answered as `/health` locally and 404 in Lambda. A target that is not origin-form (`//properties`, `http://evil/health`) is `400` `{ error: "Invalid request target" }` on both doors.

The detail route still decodes its one id segment itself. The adapter must not decode it first.

Repeated query keys are comma-joined. That is the map payload format 2.0 already puts on `queryStringParameters`. The method token is passed through; a missing method is `GET`, and a lowercase `get` is not.

## Response

Every 400, 404, and 405 body is exactly `{ error: string }` with a non-empty message (`shared/apiError.ts`). A 200 body must not be that object. `handleApiRequest` checks both before it writes JSON. A violation, a body that is not JSON, or a thrown error is `500` `{ error: "Internal server error" }`.

Expected refusals are values. `parsePropertiesQuery` returns `{ ok: false, error }`. `searchProperties` returns `{ ok: false, reason: "viewport-too-large" }` for the fan-out guard. The router maps those onto the envelope. A failed read still throws, and only this edge turns it into a 500.

`lib/api.ts` still reads `body.error` on a non-2xx response. That file is outside this change. `isApiErrorBody` is the check that read is making.
