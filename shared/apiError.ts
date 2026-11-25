/**
 * JSON body of every 400, 404, and 405, and of the 500 the HTTP edge
 * synthesizes. Success bodies are not this shape. The browse client reads
 * `body.error`; this module is the check that read is agreeing with.
 */

export type ApiErrorBody = {
  error: string;
};

/** Exactly one key, `error`, whose value is a non-empty string. */
export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  return (
    keys.length === 1 &&
    keys[0] === "error" &&
    typeof record.error === "string" &&
    record.error.trim() !== ""
  );
}

export function apiErrorBody(error: string): ApiErrorBody {
  return { error };
}
