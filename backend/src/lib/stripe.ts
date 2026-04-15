import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

/**
 * Stripe client; null when `STRIPE_SECRET_KEY` is unset (invoice routes return 503).
 */
export function getStripe(): Stripe | null {
  if (stripeSingleton) {
    return stripeSingleton;
  }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return null;
  }
  stripeSingleton = new Stripe(key);
  return stripeSingleton;
}

export function getDefaultInvoiceCurrency(): string {
  return (process.env.STRIPE_DEFAULT_CURRENCY ?? "usd").toLowerCase();
}

export function getInvoiceDaysUntilDue(): number {
  const raw = process.env.STRIPE_INVOICE_DAYS_UNTIL_DUE;
  const n = raw ? parseInt(raw, 10) : 30;
  return Number.isFinite(n) && n >= 0 ? n : 30;
}

/** Publishable key for Stripe.js (card entry on the technician device). */
export function getStripePublishableKey(): string | null {
  const k = process.env.STRIPE_PUBLISH_KEY?.trim();
  return k || null;
}
