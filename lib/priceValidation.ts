import { rentRangeIssue } from "@/shared/contract";

/**
 * UI copy for a rent range. The accept/reject decision is `rentRangeIssue`
 * in the shared contract — the same function the API validator uses — so a
 * range the price inputs commit is a range the server will accept. Wording
 * stays here because the UI speaks in sentences and the API speaks in field
 * names. The backend still re-validates; a non-UI caller can bypass this.
 */
const RENT_RANGE_MESSAGE = {
  "non-finite-min": "Minimum rent must be a finite number.",
  "non-finite-max": "Maximum rent must be a finite number.",
  "negative-min": "Minimum rent can't be negative.",
  "negative-max": "Maximum rent can't be negative.",
  inverted: "Minimum rent can't be more than maximum rent."
} as const;

export function validatePriceRange(minRent?: number, maxRent?: number): string | null {
  const issue = rentRangeIssue(minRent, maxRent);
  return issue === null ? null : RENT_RANGE_MESSAGE[issue];
}

/**
 * Which price inputs should be marked invalid. A bad minimum must not flag
 * the maximum (and the reverse); an inverted pair flags both, matching the
 * sentence that names both bounds.
 */
export function rentFieldsInvalid(
  minRent?: number,
  maxRent?: number
): { minimum: boolean; maximum: boolean } {
  const issue = rentRangeIssue(minRent, maxRent);
  switch (issue) {
    case "non-finite-min":
    case "negative-min":
      return { minimum: true, maximum: false };
    case "non-finite-max":
    case "negative-max":
      return { minimum: false, maximum: true };
    case "inverted":
      return { minimum: true, maximum: true };
    default:
      return { minimum: false, maximum: false };
  }
}
