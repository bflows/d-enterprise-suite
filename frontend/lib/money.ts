/**
 * Service item `price` values from the API are integer USD cents (same unit as Stripe amounts).
 */

export function wholeDollarsToCents(dollars: number): number {
  if (!Number.isFinite(dollars) || dollars < 0) return 0;
  return Math.round(dollars * 100);
}

export function formatUsdFromCents(cents: number): string {
  if (!Number.isFinite(cents)) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(0);
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100
  );
}
