# Properties table schema

The listings table has one physical shape. Three places used to write it down separately: `backend/scripts/create-local-table.ts`, the `TABLE_SCHEMA` constant in `tests/properties.integration.test.ts`, and `infra/lib/properties-stack.ts`. The query path held a fourth copy of the index name (`GEO_INDEX` in `backend/src/db.ts`).

Those copies matched. Nothing checked that they still would. A renamed GSI, an extra key attribute, or a different projection would succeed in whichever environment was edited and fail in the others. The integration suite would stay green if only the CDK stack changed, because it created its table from its own constant. The create script could not be imported to share that constant: loading it connects to DynamoDB and runs `CreateTable`.

## Boundary

`backend/src/properties-table.json` is the description:

- default table name `Properties`
- billing mode `PAY_PER_REQUEST`
- partition key `id` (string), no sort key
- one GSI, `geo-index`, partitioned by `geohashPrefix` and sorted by `geohash`, projection `ALL`
- the attribute list, which is exactly those key attributes, in that order

It is JSON on purpose. The CDK app is loaded by ts-node as CommonJS (`infra/cdk.json`). This repo is `"type": "module"`, so ts-node refuses to `require` a `.ts` file from `backend/`. JSON is data both loaders accept. The stack imports the JSON file and maps its type codes onto `aws-cdk-lib` enums. A code it does not know (`S`, `PAY_PER_REQUEST`, `ALL` are the ones it knows) throws while the stack is synthesized.

`backend/src/table-schema.ts` is the backend door to the same file. `parsePropertiesTableSpec` accepts the document or throws: one GSI, attributes equal to the keys in key order, and the type codes above. There is one GSI because the query path has one index name. `propertiesTableCreateInput(tableName)` is the DynamoDB `CreateTable` input. The table name is an argument. Local dev passes `tableName()` after `.env` loads, so `PROPERTIES_TABLE` still wins. The integration suite passes its own name.

`db.ts` does not redefine the name or the index. `tableName()` falls back to `DEFAULT_TABLE_NAME`. `GEO_INDEX` is `GEO_INDEX_NAME`. Viewport queries still send that value as `IndexName`. This module does not know about bounding boxes or filters.

Removal policy stays on the stack. It is an account lifecycle choice, not part of the table shape.

## What stays outside

`shared/contract.ts` is the JSON shape of a listing. It includes `geohash` and `geohashPrefix` because those fields are stored and returned. It does not say which of them is a key.

The low-level client in the create script stays local to that script. It always targets DynamoDB Local (default `http://localhost:8000`) with local credentials. `getDocClient()` does not default the endpoint, because Lambda uses the ambient AWS client when `DYNAMODB_ENDPOINT` is unset.

`backend/src/properties.ts` still decides how a viewport becomes queries. It reads `tableName()` and `GEO_INDEX` at request time and does not build a table.
