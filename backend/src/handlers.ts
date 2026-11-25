import { handleHttpApiEvent, type HttpResult } from "./http";
import type { HttpApiEvent } from "./api-request";

/**
 * AWS Lambda entry point behind API Gateway (HTTP API, payload format 2.0).
 * Adapts the event, then serializes through handleApiRequest — the same
 * function the local server uses. CORS, JSON, OPTIONS, the error envelope,
 * and 500s live there, not here.
 */
export function handler(event: HttpApiEvent): Promise<HttpResult> {
  return handleHttpApiEvent(event);
}
