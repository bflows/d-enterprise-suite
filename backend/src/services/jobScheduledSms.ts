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

type JobScheduleSmsKind = "confirmation" | "reschedule" | "reminder";

function buildJobScheduleSmsBody(job: JobConfirmationEmailPayload, kind: JobScheduleSmsKind): string {
  const customerFirst = job.customer.firstName.trim();
  const { dateLine, timeLine } = formatJobDateTime(job);
  // const tech = `${job.technician.user.firstName} ${job.technician.user.lastName}`.trim();

  const intro =
    kind === "confirmation"
      ? `Hi ${customerFirst}, your appointment with ${job.company.name} is scheduled.`
      : kind === "reschedule"
        ? `Hi ${customerFirst}, your appointment with ${job.company.name} has been rescheduled.`
        : `Hi ${customerFirst}, reminder: your appointment with ${job.company.name} is tomorrow.`;

  const closing = kind === "reminder" ? "See you then!" : "See you then.";

  return [
    intro,
    `When: ${dateLine}, ${timeLine}.`,
    closing,
  ].join(" ");
}

async function sendJobScheduleCustomerSms(
  job: JobConfirmationEmailPayload,
  kind: JobScheduleSmsKind
): Promise<void> {
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

  const body = buildJobScheduleSmsBody(job, kind);
  try {
    const message = await client.messages.create({
      to,
      body,
      ...fromFields,
    });
    if (message.errorCode != null || message.status === "failed" || message.status === "undelivered") {
      console.error("Twilio SMS failed:", {
        sid: message.sid,
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        to: message.to,
        from: message.from,
        messagingServiceSid: message.messagingServiceSid,
      });
    }
  } catch (err: unknown) {
    const twilioErr = err as { code?: number; message?: string; moreInfo?: string; status?: number };
    console.error("Twilio SMS API error:", {
      code: twilioErr.code,
      message: twilioErr.message,
      moreInfo: twilioErr.moreInfo,
      status: twilioErr.status,
    });
    throw err;
  }
}

/**
 * Sends a Programmable SMS to the customer when a scheduled job is created.
 * Requires `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and either `TWILIO_MESSAGING_SERVICE_SID`
 * or `TWILIO_PHONE_NUMBER` / `TWILIO_FROM_NUMBER` (E.164). Optional `APP_TIMEZONE` matches email formatting.
 * No-ops when Twilio is not configured or the phone cannot be normalized.
 */
export async function sendJobCreatedCustomerSms(job: JobConfirmationEmailPayload): Promise<void> {
  await sendJobScheduleCustomerSms(job, "confirmation");
}

/** SMS when date/time changes on an existing job (matches reschedule email). */
export async function sendJobRescheduleCustomerSms(job: JobConfirmationEmailPayload): Promise<void> {
  await sendJobScheduleCustomerSms(job, "reschedule");
}

/** SMS ~24 hours before the job start time (scheduled by the reminder processor). */
export async function sendJob24hReminderCustomerSms(job: JobConfirmationEmailPayload): Promise<void> {
  await sendJobScheduleCustomerSms(job, "reminder");
}
