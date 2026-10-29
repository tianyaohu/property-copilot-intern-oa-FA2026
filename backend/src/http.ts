import { CORS_HEADERS } from "./cors";
import { route, type ApiRequest } from "./router";

/** Serialized HTTP response shared by the Lambda handler and the local server. */
export type HttpResult = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

/**
 * Turn a router request into the HTTP envelope both front doors send:
 * CORS headers, a JSON body, an OPTIONS preflight, and a 500 for anything
 * the router lets escape. Status codes and response bodies stay the router's.
 */
export async function handleApiRequest(req: ApiRequest): Promise<HttpResult> {
  if (req.method === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  try {
    const result = await route(req);
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
