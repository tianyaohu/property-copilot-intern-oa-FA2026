import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { NativeAttributeValue } from "@aws-sdk/util-dynamodb";
import { GEO_INDEX, getDocClient, tableName } from "./db";
import type { Property } from "./types";

/**
 * Opaque continuation for one geo-index partition. Callers pass it back
 * unchanged; only the DynamoDB adapter knows it is a LastEvaluatedKey.
 */
export type PageCursor = Record<string, unknown>;

/** One DynamoDB Query page. A cursor means the partition has another page. */
export type GeoPrefixPage = {
  items: Property[];
  cursor?: PageCursor;
};

/**
 * One round trip against the listings table. `readPartition` sits on top of
 * `queryPage` because a 1 MB page is a DynamoDB limit, not a viewport rule.
 */
export type PropertyTable = {
  getById(id: string): Promise<Property | null>;
  put(item: Property): Promise<void>;
  queryPage(prefix: string, cursor?: PageCursor): Promise<GeoPrefixPage>;
};

/**
 * Persistence port the viewport query depends on. `readPartition` returns
 * every item in one geo-index cell; it does not know about bounding boxes.
 */
export type PropertyStore = {
  getById(id: string): Promise<Property | null>;
  put(item: Property): Promise<void>;
  readPartition(prefix: string): Promise<Property[]>;
};

/**
 * A cursor continues the read only when it carries a key. DynamoDB omits
 * LastEvaluatedKey at the end of a partition; an empty object would otherwise
 * keep the loop alive forever.
 */
export function continuation(cursor: PageCursor | undefined): PageCursor | undefined {
  if (!cursor || Object.keys(cursor).length === 0) return undefined;
  return cursor;
}

/**
 * Follow every page of one partition. The next call receives the previous
 * page's cursor and nothing else about that page.
 */
export async function readPartition(
  table: PropertyTable,
  prefix: string
): Promise<Property[]> {
  const items: Property[] = [];
  let cursor: PageCursor | undefined;

  do {
    const page = await table.queryPage(prefix, cursor);
    items.push(...page.items);
    cursor = continuation(page.cursor);
  } while (cursor);

  return items;
}

/** Adapt a table's single-page reads into the store the viewport query uses. */
export function createPropertyStore(table: PropertyTable): PropertyStore {
  return {
    getById: (id) => table.getById(id),
    put: (item) => table.put(item),
    readPartition: (prefix) => readPartition(table, prefix)
  };
}

function dynamoTable(): PropertyTable {
  return {
    async getById(id) {
      const result = await getDocClient().send(
        new GetCommand({ TableName: tableName(), Key: { id } })
      );
      return (result.Item as Property | undefined) ?? null;
    },

    async put(item) {
      await getDocClient().send(new PutCommand({ TableName: tableName(), Item: item }));
    },

    async queryPage(prefix, cursor) {
      const result = await getDocClient().send(
        new QueryCommand({
          TableName: tableName(),
          IndexName: GEO_INDEX,
          KeyConditionExpression: "geohashPrefix = :p",
          ExpressionAttributeValues: { ":p": prefix },
          // Undefined on the first page. The document client drops undefined
          // values, matching a Query that does not send ExclusiveStartKey.
          ExclusiveStartKey: cursor as Record<string, NativeAttributeValue> | undefined
        })
      );
      return {
        items: (result.Items as Property[] | undefined) ?? [],
        cursor: continuation(result.LastEvaluatedKey)
      };
    }
  };
}

/** Production store. Table name and endpoint are read when each command is sent. */
export function createDynamoPropertyStore(): PropertyStore {
  return createPropertyStore(dynamoTable());
}
