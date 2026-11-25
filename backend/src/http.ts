import {
  apiRequestFromHttpApi,
  apiRequestFromNode,
  type AdaptedRequest,
  type ApiRequest,
  type HttpApiEvent
} from "./api-request";
import { clientError, isClientErrorStatus, type ApiResponse } from "./api-response";
import { CORS_HEADERS } from "./cors";
import { route } from "./router";
import { isApiErrorBody } from "./types";

/** Serialized HTTP response shared by the Lambda handler and the local server. */
export type HttpResult = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

const INTERNAL_ERROR = "Internal server error";
const INVALID_REQUEST_TARGET = "Invalid request target";

/**
 * Turn a router request into the HTTP envelope both front doors send.
 * CORS headers, a JSON body, an OPTIONS preflight, and a 500 for anything
 * the router lets escape. A 200 whose body is the error envelope, or a
 * client-error status whose body is not exactly `{ error: string }`, is a
 * contract break and becomes that same 500 — the client reads `body.error`
 * only on failure, so a malformed failure must not leave this function.
 */
export async function handleApiRequest(req: ApiRequest): Promise<HttpResult> {
  if (req.method === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  try {
    return serialize(await route(req));
  } catch (error) {
    console.error("Unhandled error", error);
    return internalError();
  }
}

/** Lambda payload format 2.0. A non-origin-form rawPath is a 400, not a rewrite. */
export function handleHttpApiEvent(event: HttpApiEvent): Promise<HttpResult> {
  return handleAdapted(apiRequestFromHttpApi(event));
}

/**
 * Node request target (`req.url`). Same 400 as the Lambda adapter when the
 * target is not origin-form, then the same `handleApiRequest`.
 */
export function handleNodeRequest(
  method: string | undefined,
  requestTarget: string | undefined
): Promise<HttpResult> {
  return handleAdapted(apiRequestFromNode(method, requestTarget));
}

function handleAdapted(adapted: AdaptedRequest): Promise<HttpResult> {
  if (!adapted.ok) return Promise.resolve(invalidTarget());
  return handleApiRequest(adapted.request);
}

function invalidTarget(): HttpResult {
  return serialize(clientError(400, INVALID_REQUEST_TARGET));
}

function serialize(result: ApiResponse): HttpResult {
  if (result.statusCode === 200 && !isApiErrorBody(result.body)) {
    return jsonResult(200, result.body);
  }
  if (isClientErrorStatus(result.statusCode) && isApiErrorBody(result.body)) {
    return jsonResult(result.statusCode, result.body);
  }
  console.error("Response violated the HTTP envelope", result.statusCode);
  return internalError();
}

function jsonResult(statusCode: number, body: unknown): HttpResult {
  const encoded = JSON.stringify(body);
  // JSON.stringify(undefined) is undefined, not a string. That is not a body.
  if (typeof encoded !== "string") {
    console.error("Response violated the HTTP envelope", statusCode);
    return internalError();
  }
  return { statusCode, headers: CORS_HEADERS, body: encoded };
}

function internalError(): HttpResult {
  return {
    statusCode: 500,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: INTERNAL_ERROR })
  };
}
