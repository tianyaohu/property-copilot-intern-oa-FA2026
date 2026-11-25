/** Whole-dollar CAD formatter shared by every component that renders rent. */
export const CAD = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0
});

/**
 * Compact marker label for map pins, e.g. 2400 -> "2.4k", 3000 -> "3k" (the
 * trailing ".0" is dropped for round thousands). No currency symbol — the
 * marker's own pill styling already signals "this is a price."
 */
export function formatCompactRent(rent: number): string {
  if (!Number.isFinite(rent)) return "—";
  // Round to a whole dollar first. Checking `rent < 1000` before rounding
  // turned 999.5 into "1000" while 1000 became "1k".
  const roundedDollars = Math.round(rent);
  if (roundedDollars < 1000) return String(roundedDollars);
  const roundedTenths = Math.round(roundedDollars / 100) / 10; // one decimal, in thousands
  const label = Number.isInteger(roundedTenths) ? String(roundedTenths) : roundedTenths.toFixed(1);
  return `${label}k`;
}
