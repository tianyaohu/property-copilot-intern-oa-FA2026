import { queryRecordFromSearchParams } from "./query-string";

/**
 * Framework-agnostic request the router sees. Both front doors produce this:
 * the Lambda adapter from an API Gateway payload, the local server from
 * Node's request target.
 */
export type ApiRequest = {
  method: string;
  path: string;
  query: Record<string, string | undefined>;
};

/**
 * Minimal API Gateway HTTP API (payload format 2.0) event. Inlined so the
 * handler does not depend on @types/aws-lambda for three fields.
 */
export type HttpApiEvent = {
  rawPath?: string;
  queryStringParameters?: Record<string, string | undefined> | null;
  requestContext?: { http?: { method?: string } };
};

export type AdaptedRequest =
  | { ok: true; request: ApiRequest }
  | { ok: false; reason: "invalid-request-target" };

const INVALID_TARGET = { ok: false, reason: "invalid-request-target" } as const;

/**
 * Method tokens are case-sensitive. API Gateway and Node's HTTP parser both
 * send the registered uppercase form; a lowercase `get` is not GET. Missing
 * is the only case we fill in, and both adapters fill in the same default.
 */
function methodOf(method: string | undefined): string {
  return method === undefined || method === "" ? "GET" : method;
}

/**
 * Origin-form path: a single leading slash. `//properties` is scheme-relative
 * (the WHATWG parser turns it into host `properties` and path `/`). A path
 * that does not start with `/` is absolute-form (`http://evil/health`), which
 * that parser would rewrite to `/health`. API Gateway's `rawPath` is not
 * rewritten, so neither adapter accepts those targets.
 */
function isOriginFormPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

function adapted(method: string | undefined, path: string, query: ApiRequest["query"]): AdaptedRequest {
  if (!isOriginFormPath(path)) return INVALID_TARGET;
  return { ok: true, request: { method: methodOf(method), path, query } };
}

/**
 * Lambda entry. `queryStringParameters` is already the comma-joined map
 * payload format 2.0 builds; this function does not parse it again.
 */
export function apiRequestFromHttpApi(event: HttpApiEvent): AdaptedRequest {
  const rawPath = event.rawPath;
  const path = rawPath === undefined || rawPath === "" ? "/" : rawPath;
  return adapted(event.requestContext?.http?.method, path, event.queryStringParameters ?? {});
}

/**
 * Local entry. `requestTarget` is Node's `req.url` (origin-form path plus
 * query, no host). The path is taken verbatim, including `.` and `..`
 * segments. `URL.pathname` would resolve `/properties/../health` to `/health`
 * and the local server would answer the health check while Lambda, given the
 * same raw path, would 404.
 *
 * The query string is parsed with URLSearchParams and then comma-joined so
 * repeated keys match `queryStringParameters`.
 */
export function apiRequestFromNode(
  method: string | undefined,
  requestTarget: string | undefined
): AdaptedRequest {
  const target = requestTarget === undefined || requestTarget === "" ? "/" : requestTarget;
  const hash = target.indexOf("#");
  const withoutHash = hash === -1 ? target : target.slice(0, hash);
  const queryAt = withoutHash.indexOf("?");
  const path = queryAt === -1 ? withoutHash : withoutHash.slice(0, queryAt);
  const query = queryAt === -1 ? "" : withoutHash.slice(queryAt + 1);
  if (path === "") return INVALID_TARGET;
  return adapted(method, path, queryRecordFromSearchParams(new URLSearchParams(query)));
}
