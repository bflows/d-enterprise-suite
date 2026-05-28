import { getTwilioClient, getTwilioMessageFromFields, isTwilioMessagingConfigured } from "../lib/twilio";
import { normalizePhoneToE164, SMS_COMPLIANCE_NOTICE_BODY } from "../lib/smsPhone";
import { prisma } from "../lib/prisma";
import { formatJobDateTime, type JobConfirmationEmailPayload } from "./jobConfirmationEmail";
import {
  buildStatusCallbackUrl,
  getTwilioSenderAddress,
  logAutomatedOutboundSms,
  mapOutboundStatusAfterAccept,
} from "./inboxSms.service";

export { normalizePhoneToE164, SMS_COMPLIANCE_NOTICE_BODY } from "../lib/smsPhone";

async function createTwilioMessage(
  to: string,
  body: string,
  logContext?: { companyId: string; customerId: string },
): Promise<void> {
  const client = getTwilioClient();
  const fromFields = getTwilioMessageFromFields();
  if (!client || !fromFields) {
    console.warn("Twilio: client or sender not available; skipping SMS.");
    return;
  }

  const statusCallback = buildStatusCallbackUrl();
  const createOptions = {
    to,
    body,
    ...fromFields,
    ...(statusCallback ? { statusCallback } : {}),
  } as Parameters<typeof client.messages.create>[0];
  const message = await client.messages.create(createOptions);

  if (logContext) {
    await logAutomatedOutboundSms({
      companyId: logContext.companyId,
      customerId: logContext.customerId,
      body,
      twilioSid: message.sid,
      status: mapOutboundStatusAfterAccept(message.status),
      fromAddress: message.from ?? getTwilioSenderAddress() ?? "",
      toAddress: to,
    });
  }

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
}

function logTwilioApiError(err: unknown, context: string): void {
  const twilioErr = err as { code?: number; message?: string; moreInfo?: string; status?: number };
  console.error(`${context}:`, {
    code: twilioErr.code,
    message: twilioErr.message,
    moreInfo: twilioErr.moreInfo,
    status: twilioErr.status,
  });
}

/**
 * Sends the first-time compliance notice when this customer has not yet received it
 * for the normalized destination number, then sends the requested message.
 */
async function sendCustomerSms(customerId: string, rawPhone: string, body: string): Promise<void> {
  if (!isTwilioMessagingConfigured()) {
    console.warn("Twilio: credentials or sender not set; skipping customer SMS.");
    return;
  }

  const to = normalizePhoneToE164(rawPhone);
  if (!to) {
    console.warn("Twilio: customer phone missing or not E.164-normalizable; skipping customer SMS.");
    return;
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      smsComplianceNoticeSentAt: true,
      smsComplianceNoticePhone: true,
      companyId: true,
      smsOptedOutAt: true,
    },
  });
  if (!customer) {
    console.warn("Twilio: customer not found; skipping customer SMS.", { customerId });
    return;
  }

  if (customer.smsOptedOutAt) {
    console.warn("Twilio: customer opted out of SMS; skipping.", { customerId });
    return;
  }

  const logContext = { companyId: customer.companyId, customerId };

  const alreadySentForPhone =
    customer.smsComplianceNoticeSentAt != null && customer.smsComplianceNoticePhone === to;

  if (!alreadySentForPhone) {
    const claimedAt = new Date();
    const claim = await prisma.customer.updateMany({
      where: {
        id: customerId,
        OR: [{ smsComplianceNoticeSentAt: null }, { smsComplianceNoticePhone: { not: to } }],
      },
      data: {
        smsComplianceNoticeSentAt: claimedAt,
        smsComplianceNoticePhone: to,
      },
    });

    if (claim.count > 0) {
      try {
        await createTwilioMessage(to, SMS_COMPLIANCE_NOTICE_BODY, logContext);
      } catch (err: unknown) {
        await prisma.customer.update({
          where: { id: customerId },
          data: { smsComplianceNoticeSentAt: null, smsComplianceNoticePhone: null },
        });
        logTwilioApiError(err, "Twilio SMS compliance notice API error");
        throw err;
      }
    }
  }

  try {
    await createTwilioMessage(to, body, logContext);
  } catch (err: unknown) {
    logTwilioApiError(err, "Twilio SMS API error");
    throw err;
  }
}

type JobScheduleSmsKind = "confirmation" | "reschedule" | "reminder";

function buildJobScheduleSmsBody(job: JobConfirmationEmailPayload, kind: JobScheduleSmsKind): string {
  const customerFirst = job.customer.firstName.trim();
  const { dateLine, timeLine } = formatJobDateTime(job);

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
  const body = buildJobScheduleSmsBody(job, kind);
  await sendCustomerSms(job.customer.id, job.customer.phone, body);
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

function buildJobEnRouteSmsBody(job: JobConfirmationEmailPayload): string {
  const customerFirst = job.customer.firstName.trim();
  const techName =
    `${job.technician.user.firstName}`.trim();
  return `Hi ${customerFirst}, this is ${techName} with ${job.company.name}. I'm on the way now and will see you shortly.`;
}

function buildJobCompletedSmsBody(job: JobConfirmationEmailPayload): string {
  const customerFirst = job.customer.firstName.trim();
  return [
    `All set! Thanks for choosing ${job.company.name}, ${customerFirst}.`,
    `We're a small local business and reviews help us grow. If you were happy with the service, we'd truly appreciate a quick review here:`,
    `https://g.page/r/CXTywCBRvFILEBE/review`,
  ].join(" ");
}

function buildJobCancelledSmsBody(job: JobConfirmationEmailPayload): string {
  const customerFirst = job.customer.firstName.trim() || "there";
  return `Hi ${customerFirst}, your appointment with ${job.company.name} has been cancelled. If you need to reschedule, please contact us.`;
}

/** SMS when a technician marks the job as completed. */
export async function sendJobCompletedCustomerSms(job: JobConfirmationEmailPayload): Promise<void> {
  const body = buildJobCompletedSmsBody(job);
  await sendCustomerSms(job.customer.id, job.customer.phone, body);
}

/** SMS when a dispatcher/admin cancels a job. */
export async function sendJobCancelledCustomerSms(job: JobConfirmationEmailPayload): Promise<void> {
  const body = buildJobCancelledSmsBody(job);
  await sendCustomerSms(job.customer.id, job.customer.phone, body);
}

/** SMS when a technician marks the job as en route ("On the way"). */
export async function sendJobEnRouteCustomerSms(job: JobConfirmationEmailPayload): Promise<void> {
  const body = buildJobEnRouteSmsBody(job);
  await sendCustomerSms(job.customer.id, job.customer.phone, body);
}

export type JobInvoiceSmsPayload = {
  customer: { id: string; firstName: string; phone: string };
  company: { id: string; name: string };
  hostedInvoiceUrl: string;
  invoiceNumber?: string | null;
  amountDueCents?: number | null;
  currency?: string | null;
};

function formatInvoiceAmountCents(cents: number, currency: string): string {
  const amount = cents / 100;
  const code = currency.trim().toUpperCase() || "USD";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function buildJobInvoiceSmsBody(payload: JobInvoiceSmsPayload): string {
  const customerFirst = payload.customer.firstName.trim() || "there";
  const companyName = payload.company.name.trim() || "us";
  const url = payload.hostedInvoiceUrl.trim();
  const number = payload.invoiceNumber?.trim();
  const cents = payload.amountDueCents;
  const currency = payload.currency?.trim() || "usd";

  const amountPart =
    cents != null && cents > 0 ? ` for ${formatInvoiceAmountCents(cents, currency)}` : "";
  const numberPart = number ? ` #${number}` : "";

  return [
    `Hi ${customerFirst}, your invoice${numberPart} from ${companyName}${amountPart} is ready.`,
    `Pay here: ${url}`,
  ].join(" ");
}

/** SMS with the Stripe hosted invoice link when an invoice is sent from a job. */
export async function sendJobInvoiceCustomerSms(payload: JobInvoiceSmsPayload): Promise<void> {
  const url = payload.hostedInvoiceUrl?.trim();
  if (!url) {
    console.warn("Twilio: no hosted invoice URL; skipping invoice SMS.");
    return;
  }
  const body = buildJobInvoiceSmsBody({ ...payload, hostedInvoiceUrl: url });
  await sendCustomerSms(payload.customer.id, payload.customer.phone, body);
}
