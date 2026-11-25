/**
 * Backend door to the shared wire contract. Import from here inside
 * `backend/` so call sites stay on a local path. Listing shapes live in
 * `shared/contract.ts` (the same objects the client re-exports). The error
 * envelope lives in `shared/apiError.ts`.
 */
export type {
  City,
  PropertiesListResponse,
  Property,
  PropertyFilter,
  PropertyResponse,
  PropertyType,
  RentRangeIssue
} from "../../shared/contract";

export type { ApiErrorBody } from "../../shared/apiError";

export {
  CITIES,
  PROPERTY_TYPES,
  isPropertyType,
  propertiesListResponse,
  propertyResponse,
  rentRangeIssue
} from "../../shared/contract";

export { apiErrorBody, isApiErrorBody } from "../../shared/apiError";
