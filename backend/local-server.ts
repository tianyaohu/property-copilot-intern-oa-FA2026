import { createServer } from "node:http";
import nextEnv from "@next/env";
import { handleApiRequest } from "./src/http";
import { queryRecordFromSearchParams } from "./src/query-string";

// Load .env so DYNAMODB_ENDPOINT / PROPERTIES_TABLE are available locally.
nextEnv.loadEnvConfig(process.cwd());

const PORT = Number(process.env.API_PORT ?? 4000);

/**
 * Local stand-in for API Gateway + Lambda. Serializes through the same
 * handleApiRequest the deployed handler uses, so CORS, JSON, and 500s match.
 * Repeated query keys are joined with a comma first — that is the map HTTP
 * API payload 2.0 already gives the Lambda.
 */
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const query = queryRecordFromSearchParams(url.searchParams);

  const result = await handleApiRequest({
    method: req.method ?? "GET",
    path: url.pathname,
    query
  });
  res.writeHead(result.statusCode, result.headers).end(result.body);
});

server.listen(PORT, () => {
  console.log(`Local API listening on http://localhost:${PORT}`);
});
