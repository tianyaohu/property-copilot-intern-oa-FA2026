import { createServer } from "node:http";
import nextEnv from "@next/env";
import { handleNodeRequest } from "./src/http";

// Load .env so DYNAMODB_ENDPOINT / PROPERTIES_TABLE are available locally.
// tableName() reads them when a request is built, after this call.
nextEnv.loadEnvConfig(process.cwd());

const PORT = Number(process.env.API_PORT ?? 4000);

/**
 * Local stand-in for API Gateway + Lambda. The request target is adapted
 * the same way payload format 2.0 fills rawPath and queryStringParameters,
 * then serialized by the same function the Lambda handler calls.
 */
const server = createServer(async (req, res) => {
  const result = await handleNodeRequest(req.method, req.url);
  res.writeHead(result.statusCode, result.headers).end(result.body);
});

server.listen(PORT, () => {
  console.log(`Local API listening on http://localhost:${PORT}`);
});
