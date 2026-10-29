import { handleApiRequest, type HttpResult } from "./http";

/**
 * Minimal shape of an API Gateway HTTP API (payload format 2.0) event. Inlined
 * to avoid pulling in @types/aws-lambda for a couple of fields.
 */
type HttpApiEvent = {
  rawPath?: string;
  queryStringParameters?: Record<string, string | undefined> | null;
  requestContext?: { http?: { method?: string } };
};

/**
 * AWS Lambda entry point behind API Gateway (HTTP API, payload format 2.0).
 * Maps the event onto the shared request. Serialization (CORS, JSON, OPTIONS,
 * 500) lives in handleApiRequest, which the local dev server also calls.
 */
export async function handler(event: HttpApiEvent): Promise<HttpResult> {
  const method = event.requestContext?.http?.method ?? "GET";
  return handleApiRequest({
    method,
    path: event.rawPath ?? "/",
    query: event.queryStringParameters ?? {}
  });
}
