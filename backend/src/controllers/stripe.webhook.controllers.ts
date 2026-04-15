import type { Request, Response } from "express";
import type Stripe from "stripe";
import { getStripe } from "../lib/stripe";
import { syncInvoiceFromStripe } from "../lib/stripeInvoiceJobSync";

const RELEVANT_EVENTS = new Set<Stripe.Event.Type>([
  "invoice.paid",
  "invoice.voided",
  "invoice.marked_uncollectible",
  "invoice.updated",
]);

/**
 * Stripe webhook: verify signature and sync invoice status from Stripe invoice events.
 * Requires raw body (`express.raw`) and `STRIPE_SECRET_KEY`.
 */
export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_SECRET_KEY?.trim();

  if (!stripe || !webhookSecret) {
    res.status(503).json({
      success: false,
      message: "Stripe webhooks are not configured (STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET).",
    });
    return;
  }

  const sig = req.headers["stripe-signature"];
  if (typeof sig !== "string") {
    res.status(400).json({ success: false, message: "Missing Stripe-Signature header." });
    return;
  }

  const rawBody = req.body;
  if (!Buffer.isBuffer(rawBody)) {
    res.status(400).json({ success: false, message: "Expected raw body buffer for webhook verification." });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature.";
    console.error("Stripe webhook signature verification failed:", message);
    res.status(400).json({ success: false, message: `Webhook Error: ${message}` });
    return;
  }

  if (!RELEVANT_EVENTS.has(event.type)) {
    res.status(200).json({ received: true });
    return;
  }

  const inv = event.data.object as Stripe.Invoice;
  if (!inv || typeof inv.id !== "string") {
    res.status(200).json({ received: true });
    return;
  }

  try {
    await syncInvoiceFromStripe(inv);
  } catch (e) {
    console.error("Stripe webhook invoice sync error:", e);
    res.status(500).json({ success: false, message: "Failed to sync invoice from Stripe." });
    return;
  }

  res.status(200).json({ received: true });
};
