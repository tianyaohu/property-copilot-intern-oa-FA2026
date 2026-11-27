/**
 * Physical shape of the Properties table.
 *
 * The description itself is `properties-table.json`. This module is the
 * backend's typed door to it: names the query path uses, and the CreateTable
 * input local dev and the integration suite send. The CDK stack reads the
 * same JSON and does not import this file — ts-node cannot require a .ts
 * module from this ESM package. See docs/architecture/table-schema.md.
 */
import rawSpec from "./properties-table.json";

export type KeyAttribute = {
  readonly name: string;
  /** DynamoDB attribute type code. CDK's AttributeType enum uses the same codes. */
  readonly type: "S";
};

export type GlobalSecondaryIndexSpec = {
  readonly indexName: string;
  readonly partitionKey: KeyAttribute;
  readonly sortKey: KeyAttribute;
  /** DynamoDB projection type. CDK's ProjectionType enum uses the same codes. */
  readonly projection: "ALL";
};

export type PropertiesTableSpec = {
  readonly defaultTableName: string;
  readonly billingMode: "PAY_PER_REQUEST";
  readonly partitionKey: KeyAttribute;
  readonly attributes: readonly KeyAttribute[];
  readonly globalSecondaryIndexes: readonly [GlobalSecondaryIndexSpec];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseKeyAttribute(value: unknown, label: string): KeyAttribute {
  if (!isRecord(value) || typeof value.name !== "string" || value.name === "") {
    throw new Error(`${label} must have a non-empty name`);
  }
  if (value.type !== "S") {
    throw new Error(`${label} type must be "S"`);
  }
  return { name: value.name, type: "S" };
}

function sameKey(left: KeyAttribute, right: KeyAttribute): boolean {
  return left.name === right.name && left.type === right.type;
}

/**
 * Accept the JSON document or throw. Attributes must be exactly the key
 * attributes, in key order: table partition key, then each index's partition
 * key and sort key. There is one GSI because `GEO_INDEX` is one name — the
 * query path has no second index to choose.
 */
export function parsePropertiesTableSpec(raw: unknown): PropertiesTableSpec {
  if (!isRecord(raw)) {
    throw new Error("Properties table spec must be an object");
  }
  if (typeof raw.defaultTableName !== "string" || raw.defaultTableName === "") {
    throw new Error("defaultTableName must be a non-empty string");
  }
  if (raw.billingMode !== "PAY_PER_REQUEST") {
    throw new Error('billingMode must be "PAY_PER_REQUEST"');
  }

  const partitionKey = parseKeyAttribute(raw.partitionKey, "partitionKey");
  if (!Array.isArray(raw.attributes)) {
    throw new Error("attributes must be a list");
  }
  const attributes = raw.attributes.map((attribute, index) =>
    parseKeyAttribute(attribute, `attributes[${index}]`)
  );

  if (!Array.isArray(raw.globalSecondaryIndexes) || raw.globalSecondaryIndexes.length !== 1) {
    throw new Error("globalSecondaryIndexes must contain exactly the geo index");
  }
  const index = raw.globalSecondaryIndexes[0];
  if (!isRecord(index) || typeof index.indexName !== "string" || index.indexName === "") {
    throw new Error("globalSecondaryIndexes[0] must have a non-empty indexName");
  }
  if (index.projection !== "ALL") {
    throw new Error('globalSecondaryIndexes[0] projection must be "ALL"');
  }
  const geoIndex: GlobalSecondaryIndexSpec = {
    indexName: index.indexName,
    partitionKey: parseKeyAttribute(index.partitionKey, "globalSecondaryIndexes[0].partitionKey"),
    sortKey: parseKeyAttribute(index.sortKey, "globalSecondaryIndexes[0].sortKey"),
    projection: "ALL"
  };

  const keys = [partitionKey, geoIndex.partitionKey, geoIndex.sortKey];
  if (
    attributes.length !== keys.length ||
    attributes.some((attribute, i) => !sameKey(attribute, keys[i]))
  ) {
    throw new Error("attributes must list every key in key order and nothing else");
  }

  return {
    defaultTableName: raw.defaultTableName,
    billingMode: "PAY_PER_REQUEST",
    partitionKey,
    attributes,
    globalSecondaryIndexes: [geoIndex]
  };
}

export const PROPERTIES_TABLE_SPEC = parsePropertiesTableSpec(rawSpec);

export const DEFAULT_TABLE_NAME = PROPERTIES_TABLE_SPEC.defaultTableName;

/** Partition key of the geospatial GSI. Queries pass this as `IndexName`. */
export const GEO_INDEX_NAME = PROPERTIES_TABLE_SPEC.globalSecondaryIndexes[0].indexName;

/**
 * `CreateTable` input for one physical name. Local dev passes the configured
 * table name; the integration suite passes its own. The key schema does not
 * change between them.
 */
export function propertiesTableCreateInput(tableName: string) {
  const spec = PROPERTIES_TABLE_SPEC;
  const geoIndex = spec.globalSecondaryIndexes[0];
  return {
    TableName: tableName,
    BillingMode: spec.billingMode,
    AttributeDefinitions: spec.attributes.map((attribute) => ({
      AttributeName: attribute.name,
      AttributeType: attribute.type
    })),
    KeySchema: [{ AttributeName: spec.partitionKey.name, KeyType: "HASH" as const }],
    GlobalSecondaryIndexes: [
      {
        IndexName: geoIndex.indexName,
        KeySchema: [
          { AttributeName: geoIndex.partitionKey.name, KeyType: "HASH" as const },
          { AttributeName: geoIndex.sortKey.name, KeyType: "RANGE" as const }
        ],
        Projection: { ProjectionType: geoIndex.projection }
      }
    ]
  };
}
