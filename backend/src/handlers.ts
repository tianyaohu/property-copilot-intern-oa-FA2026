import { CORS_HEADERS } from "./cors";
import { route } from "./router";

/**
 * Minimal shape of an API Gateway HTTP API (payload format 2.0) event. Inlined
 * to avoid pulling in @types/aws-lambda for a couple of fields.
 */
type HttpApiEvent = {
  rawPath?: string;
  queryStringParameters?: Record<string, string | undefined> | null;
  requestContext?: { http?: { method?: string } };
};

type HttpApiResult = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

/**
 * AWS Lambda entry point behind API Gateway (HTTP API, payload format 2.0).
 * Delegates to the shared router so behaviour matches local dev exactly.
 */
export async function handler(event: HttpApiEvent): Promise<HttpApiResult> {
  const method = event.requestContext?.http?.method ?? "GET";

  if (method === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  try {
    const result = await route({
      method,
      path: event.rawPath ?? "/",
      query: event.queryStringParameters ?? {}
    });
    return {
      statusCode: result.statusCode,
      headers: CORS_HEADERS,
      body: JSON.stringify(result.body)
    };
  } catch (error) {
    console.error("Unhandled error", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Internal server error" })
    };
  }
}
