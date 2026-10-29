/**
 * Backend door to the shared wire contract. Import from here inside
 * `backend/` so call sites stay on a local path; the definitions live in
 * `shared/contract.ts` and are the same objects the client re-exports.
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

export {
  CITIES,
  PROPERTY_TYPES,
  isPropertyType,
  propertiesListResponse,
  propertyResponse,
  rentRangeIssue
} from "../../shared/contract";
