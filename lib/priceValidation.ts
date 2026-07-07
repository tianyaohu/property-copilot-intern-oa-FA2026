/**
 * Validate a rent range for the price filter UI. Mirrors the domain rules
 * enforced server-side by validateFilter in backend/src/filter.ts, narrowed
 * to the two rent fields — bedrooms/bathrooms don't need this here since
 * they're stepper-driven and can't go negative by construction. This is a
 * UX nicety only: the backend is the source of truth and re-validates
 * independently, since a non-UI caller can always bypass this check.
 */
export function validatePriceRange(minRent?: number, maxRent?: number): string | null {
  if (minRent !== undefined && minRent < 0) {
    return "Minimum rent can't be negative.";
  }
  if (maxRent !== undefined && maxRent < 0) {
    return "Maximum rent can't be negative.";
  }
  if (minRent !== undefined && maxRent !== undefined && minRent > maxRent) {
    return "Minimum rent can't be more than maximum rent.";
  }
  return null;
}
