import { getTwilioClient, getTwilioMessageFromFields, isTwilioMessagingConfigured } from "../lib/twilio";
import { formatJobDateTime, type JobConfirmationEmailPayload } from "./jobConfirmationEmail";

/**
 * Normalize a stored phone string toward E.164 for Twilio.
 * US-centric: bare 10 digits get +1; 11 digits starting with 1 get + prefix.
 */
export function normalizePhoneToE164(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (s.startsWith("+")) {
    const digits = s.slice(1).replace(/\D/g, "");
    if (digits.length >= 8 && digits.length <= 15) {
      return `+${digits}`;
    }
    return null;
  }
  const digits = s.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  return null;
}

function buildJobScheduledSmsBody(job: JobConfirmationEmailPayload): string {
  const customerFirst = job.customer.firstName.trim();
  const { dateLine, timeLine } = formatJobDateTime(job);
  const tech = `${job.technician.user.firstName} ${job.technician.user.lastName}`.trim();
  const serviceSummary =
    job.services.length > 0
      ? job.services.map((x) => x.title).join(", ")
      : "services TBD";

  return [
    `Hi ${customerFirst}, your appointment with ${job.company.name} is scheduled.`,
    `When: ${dateLine}, ${timeLine}`,
    `Technician: ${tech}`,
    `Services: ${serviceSummary}`,
    "Contact the office to reschedule.",
  ].join(" ");
}

/**
 * Sends a Programmable SMS to the customer when a scheduled job is created.
 * Requires `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and either `TWILIO_MESSAGING_SERVICE_SID`
 * or `TWILIO_PHONE_NUMBER` / `TWILIO_FROM_NUMBER` (E.164). Optional `APP_TIMEZONE` matches email formatting.
 * No-ops when Twilio is not configured or the phone cannot be normalized.
 */
export async function sendJobCreatedCustomerSms(job: JobConfirmationEmailPayload): Promise<void> {
  if (!isTwilioMessagingConfigured()) {
    console.warn("Twilio: credentials or sender not set; skipping job SMS.");
    return;
  }
  const client = getTwilioClient();
  const fromFields = getTwilioMessageFromFields();
  if (!client || !fromFields) {
    console.warn("Twilio: client or sender not available; skipping job SMS.");
    return;
  }

  const to = normalizePhoneToE164(job.customer.phone);
  if (!to) {
    console.warn("Twilio: customer phone missing or not E.164-normalizable; skipping job SMS.");
    return;
  }

  const body = buildJobScheduledSmsBody(job);
  await client.messages.create({
    to,
    body,
    ...fromFields,
  });
}
