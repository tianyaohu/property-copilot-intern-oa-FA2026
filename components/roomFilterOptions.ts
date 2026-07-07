/**
 * Shared option lists for the Bedrooms/Bathrooms button rows, used by both
 * the quick Rooms popover and the master Filters modal so the two surfaces
 * always offer identical choices.
 *
 * Bedrooms has no explicit "Any" entry — clicking the already-selected value
 * again clears it (see OptionRow's doc comment). Bathrooms includes an
 * explicit "Any" option instead, and stays minimum-only (no exact-match
 * toggle): there's no product need for an exact bathroom count.
 */
export const BEDROOM_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Studio" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" }
];

export const BATHROOM_OPTIONS: { value: number | undefined; label: string }[] = [
  { value: undefined, label: "Any" },
  { value: 1, label: "1+" },
  { value: 2, label: "2+" },
  { value: 3, label: "3+" },
  { value: 4, label: "4+" }
];
