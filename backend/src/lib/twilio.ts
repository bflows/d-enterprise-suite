import twilio from "twilio";
import type { Twilio } from "twilio";

let twilioClient: Twilio | null = null;

function readAccountSid(): string | undefined {
  return process.env.TWILIO_ACCOUNT_SID?.trim();
}

function readAuthToken(): string | undefined {
  return process.env.TWILIO_AUTH_TOKEN?.trim();
}

/**
 * Twilio REST client; null when account SID or auth token is missing.
 * Configure `TWILIO_PHONE_NUMBER` (E.164) or `TWILIO_MESSAGING_SERVICE_SID` when sending.
 */
export function getTwilioClient(): Twilio | null {
  if (twilioClient) {
    return twilioClient;
  }
  const accountSid = readAccountSid();
  const authToken = readAuthToken();
  if (!accountSid || !authToken) {
    return null;
  }
  twilioClient = twilio(accountSid, authToken);
  return twilioClient;
}

export function isTwilioMessagingConfigured(): boolean {
  if (!readAccountSid() || !readAuthToken()) {
    return false;
  }
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  const fromNumber =
    process.env.TWILIO_PHONE_NUMBER?.trim() || process.env.TWILIO_FROM_NUMBER?.trim();
  return Boolean(messagingServiceSid || fromNumber);
}

export function getTwilioMessageFromFields(): { messagingServiceSid: string } | { from: string } | null {
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  if (messagingServiceSid) {
    return { messagingServiceSid };
  }
  const from =
    process.env.TWILIO_PHONE_NUMBER?.trim() || process.env.TWILIO_FROM_NUMBER?.trim();
  if (from) {
    return { from };
  }
  return null;
}
