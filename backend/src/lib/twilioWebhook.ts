import twilio from "twilio";
import type { Request } from "express";

function webhookPath(req: Request): string {
  return req.originalUrl.split("?")[0] ?? "";
}

/** URL built from the incoming HTTP request (Host + path). */
export function getTwilioWebhookRequestUrl(req: Request): string {
  const path = webhookPath(req);
  const host = req.get("host") ?? "";
  const protocol = req.protocol || "https";
  return `${protocol}://${host}${path}`;
}

/**
 * URL from `TWILIO_WEBHOOK_PUBLIC_URL` / `API_PUBLIC_URL` when set.
 * Must match the URL configured in Twilio Console (scheme + host + path).
 */
export function getTwilioWebhookValidationUrl(req: Request): string {
  const configured =
    process.env.TWILIO_WEBHOOK_PUBLIC_URL?.trim() || process.env.API_PUBLIC_URL?.trim();
  const path = webhookPath(req);

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

  return getTwilioWebhookRequestUrl(req);
}

function uniqueUrls(urls: string[]): string[] {
  return [...new Set(urls.filter(Boolean))];
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

  const body = req.body as Record<string, string>;
  const candidates = uniqueUrls([
    getTwilioWebhookValidationUrl(req),
    getTwilioWebhookRequestUrl(req),
  ]);

  for (const url of candidates) {
    if (twilio.validateRequest(authToken, signature, url, body)) {
      return true;
    }
  }

  console.error("Twilio webhook: signature validation failed.", {
    triedUrls: candidates,
    path: req.originalUrl,
    host: req.get("host"),
    hint:
      "Twilio signs the exact public URL it POSTs to. Set TWILIO_WEBHOOK_PUBLIC_URL to that base (e.g. https://your-app.herokuapp.com) and configure the same host in Twilio Console → Phone Number or Messaging Service → Incoming Message webhook: .../api/twilio/webhook/sms",
  });

  return false;
}
