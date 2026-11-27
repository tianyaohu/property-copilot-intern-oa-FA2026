import {
  CreateTableCommand,
  DynamoDBClient,
  DescribeTableCommand
} from "@aws-sdk/client-dynamodb";
import nextEnv from "@next/env";
import { tableName } from "../src/db";
import { GEO_INDEX_NAME, propertiesTableCreateInput } from "../src/table-schema";

// Creates the Properties table (and geo GSI) in DynamoDB Local for development.
// The real table is created by the CDK stack (infra/) in your AWS account.
// Both use backend/src/table-schema.ts, so the keys cannot drift.

nextEnv.loadEnvConfig(process.cwd());

const TABLE_NAME = tableName();
const ENDPOINT = process.env.DYNAMODB_ENDPOINT ?? "http://localhost:8000";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION ?? "us-west-2",
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "local",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "local"
  }
});

async function main() {
  try {
    await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    console.log(`Table "${TABLE_NAME}" already exists at ${ENDPOINT}.`);
    return;
  } catch {
    // Table does not exist yet; create it below.
  }

  await client.send(new CreateTableCommand(propertiesTableCreateInput(TABLE_NAME)));

  console.log(`Created table "${TABLE_NAME}" with ${GEO_INDEX_NAME} at ${ENDPOINT}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
