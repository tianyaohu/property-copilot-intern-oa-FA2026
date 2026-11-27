import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DEFAULT_TABLE_NAME, GEO_INDEX_NAME } from "./table-schema";

/**
 * DynamoDB table name at call time. The seed script and local server load
 * `.env` after this module is imported, and `npm run db:local` reads
 * PROPERTIES_TABLE after that load. Reading the name on each request keeps
 * writes, viewport queries, and the created table on the configured name.
 * Lambda sets the variable before the process loads this module. The fallback
 * is the name the CDK stack provisions.
 */
export function tableName(): string {
  return process.env.PROPERTIES_TABLE ?? DEFAULT_TABLE_NAME;
}

/** Geospatial GSI name from the table spec. Queries send it as `IndexName`. */
export const GEO_INDEX = GEO_INDEX_NAME;

let docClient: DynamoDBDocumentClient | undefined;

/**
 * Returns a shared DynamoDB DocumentClient. When `DYNAMODB_ENDPOINT` is set
 * (local dev / tests against DynamoDB Local) it targets that endpoint;
 * otherwise it uses the ambient AWS credentials and region (the Lambda role in
 * production).
 */
export function getDocClient(): DynamoDBDocumentClient {
  if (docClient) {
    return docClient;
  }

  const endpoint = process.env.DYNAMODB_ENDPOINT;
  const base = new DynamoDBClient({
    region: process.env.AWS_REGION ?? "us-west-2",
    ...(endpoint
      ? {
          endpoint,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "local",
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "local"
          }
        }
      : {})
  });

  docClient = DynamoDBDocumentClient.from(base, {
    marshallOptions: { removeUndefinedValues: true }
  });
  return docClient;
}
