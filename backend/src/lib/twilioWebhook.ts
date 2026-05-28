import twilio from "twilio";
import type { Request } from "express";

/** Full URL Twilio posted to — required for signature validation behind proxies/ngrok. */
export function getTwilioWebhookValidationUrl(req: Request): string {
  const configured = process.env.TWILIO_WEBHOOK_PUBLIC_URL?.trim();
  const path = req.originalUrl.split("?")[0];

  if (configured) {
    const base = configured.replace(/\/$/, "");
    if (path && base.endsWith(path)) {
      return base;
    }
    if (base.includes("/api/twilio/webhook")) {
      return base;
    }
    return path ? `${base}${path}` : base;
  }

  const host = req.get("host") ?? "";
  const protocol = req.protocol || "https";
  return `${protocol}://${host}${path}`;
}

/**
 * Validates Twilio webhook signature.
 * Set `TWILIO_WEBHOOK_PUBLIC_URL` to the exact public URL Twilio calls (e.g. ngrok + path).
 */
export function validateTwilioWebhookRequest(req: Request): boolean {
  if (process.env.TWILIO_WEBHOOK_SKIP_SIGNATURE_VALIDATION === "true") {
    console.warn("Twilio webhook: signature validation skipped (TWILIO_WEBHOOK_SKIP_SIGNATURE_VALIDATION).");
    return true;
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!authToken) {
    console.warn("Twilio webhook: TWILIO_AUTH_TOKEN not set; skipping signature validation.");
    return process.env.NODE_ENV !== "production";
  }

  const signature = req.headers["x-twilio-signature"];
  if (typeof signature !== "string") {
    console.error("Twilio webhook: missing X-Twilio-Signature header.");
    return false;
  }

  const url = getTwilioWebhookValidationUrl(req);
  const valid = twilio.validateRequest(authToken, signature, url, req.body as Record<string, string>);

  if (!valid) {
    console.error("Twilio webhook: signature validation failed.", {
      validationUrl: url,
      path: req.originalUrl,
      hint: "Set TWILIO_WEBHOOK_PUBLIC_URL to the exact URL configured in Twilio Console (including /api/twilio/webhook/sms).",
    });
  }

  return valid;
}
