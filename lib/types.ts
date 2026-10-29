/**
 * Frontend door to the shared wire contract (`shared/contract.ts`).
 * Components keep importing listing and filter types from here. The value
 * re-exports are plain data — no server code — so client components can
 * import this module.
 */
export type {
  City,
  PropertiesListResponse,
  Property,
  PropertyFilter,
  PropertyResponse,
  PropertyType
} from "@/shared/contract";

export { CITIES, PROPERTY_TYPES } from "@/shared/contract";
