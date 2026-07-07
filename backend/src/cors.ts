/**
 * CORS + content-type headers shared by both HTTP front doors (the Lambda
 * handler and the local dev server), so browser behaviour matches exactly.
 */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
};
