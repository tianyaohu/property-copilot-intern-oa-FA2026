import { apiErrorBody, type ApiErrorBody } from "./types";

/** Statuses the router returns for a rejected request. 500 is not one of them. */
export const CLIENT_ERROR_STATUSES = [400, 404, 405] as const;

export type ClientErrorStatus = (typeof CLIENT_ERROR_STATUSES)[number];

export function isClientErrorStatus(status: number): status is ClientErrorStatus {
  return (CLIENT_ERROR_STATUSES as readonly number[]).includes(status);
}

export type ApiResponse = {
  statusCode: number;
  body: unknown;
};

export function ok(body: unknown): ApiResponse {
  return { statusCode: 200, body };
}

/**
 * A client error the router decided, not an exception. The message is the
 * stable API text. An empty message is a programmer error: the HTTP edge
 * turns the throw into a 500 rather than emitting `{ error: "" }`, which
 * `isApiErrorBody` would also refuse.
 */
export function clientError(statusCode: ClientErrorStatus, error: string): ApiResponse {
  if (error.trim() === "") {
    throw new Error("Client error message must be non-empty");
  }
  const body: ApiErrorBody = apiErrorBody(error);
  return { statusCode, body };
}
