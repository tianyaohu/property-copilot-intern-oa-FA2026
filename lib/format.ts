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
  if (rent < 1000) return String(Math.round(rent));
  const roundedTenths = Math.round(rent / 100) / 10; // one decimal, in thousands
  const label = Number.isInteger(roundedTenths) ? String(roundedTenths) : roundedTenths.toFixed(1);
  return `${label}k`;
}
