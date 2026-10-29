/**
 * Build the query map the router sees, matching API Gateway HTTP API payload
 * format 2.0. That format has no multi-value map: repeated keys are joined
 * with a comma (`propertyType=apartment&propertyType=condo` arrives as
 * `apartment,condo`). URLSearchParams' last-wins iteration does the opposite,
 * so local dev would keep only `condo` while Lambda keeps both — and a
 * repeated `minRent` would be a different number locally than the comma-joined
 * token production rejects.
 */
export function queryRecordFromSearchParams(
  searchParams: URLSearchParams
): Record<string, string> {
  const query: Record<string, string> = {};
  for (const key of searchParams.keys()) {
    if (Object.prototype.hasOwnProperty.call(query, key)) continue;
    query[key] = searchParams.getAll(key).join(",");
  }
  return query;
}
