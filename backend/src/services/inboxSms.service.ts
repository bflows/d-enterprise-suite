import type { MessageDeliveryStatus, MessageDirection } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { getTwilioClient, getTwilioMessageFromFields, isTwilioMessagingConfigured } from "../lib/twilio";
import {
  normalizePhoneToE164,
  phonesMatchE164,
  SMS_COMPLIANCE_NOTICE_BODY,
} from "../lib/smsPhone";
import { publishInboxEvent } from "./inboxRealtime.service";

const STOP_KEYWORDS = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
const START_KEYWORDS = new Set(["START", "UNSTOP", "YES"]);

/**
 * Identity stored on threads for routing. Prefer E.164 phone so inbound `To` matches.
 * Falls back to `mg:<sid>` when only a Messaging Service is configured.
 */
export function getTwilioSenderAddress(): string | null {
  const from =
    process.env.TWILIO_PHONE_NUMBER?.trim() || process.env.TWILIO_FROM_NUMBER?.trim();
  const normalizedFrom = from ? normalizePhoneToE164(from) : null;
  if (normalizedFrom) {
    return normalizedFrom;
  }
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  if (messagingServiceSid) {
    return `mg:${messagingServiceSid}`;
  }
  return null;
}

function previewBody(body: string, max = 120): string {
  const trimmed = body.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function mapTwilioStatusToDelivery(
  status: string | null | undefined,
  direction: MessageDirection,
): MessageDeliveryStatus {
  const s = (status ?? "").toLowerCase();
  switch (s) {
    case "queued":
      return "QUEUED";
    case "sending":
      return "SENDING";
    case "sent":
      return "SENT";
    case "delivered":
      return "DELIVERED";
    case "undelivered":
      return "UNDELIVERED";
    case "failed":
      return "FAILED";
    case "received":
      return "RECEIVED";
    default:
      return direction === "INBOUND" ? "RECEIVED" : "QUEUED";
  }
}

/**
 * Twilio's create API often returns `queued` even when the message was accepted.
 * Treat in-flight outbound statuses as SENT once the API call succeeded.
 */
export function mapOutboundStatusAfterAccept(
  status: string | null | undefined,
): MessageDeliveryStatus {
  const mapped = mapTwilioStatusToDelivery(status, "OUTBOUND");
  if (mapped === "QUEUED" || mapped === "SENDING") {
    return "SENT";
  }
  return mapped;
}

const OUTBOUND_STATUS_RANK: Record<MessageDeliveryStatus, number> = {
  QUEUED: 0,
  SENDING: 1,
  SENT: 2,
  DELIVERED: 3,
  RECEIVED: 0,
  FAILED: 10,
  UNDELIVERED: 10,
};

function resolveStatusFromWebhook(
  current: MessageDeliveryStatus,
  incoming: MessageDeliveryStatus,
  direction: MessageDirection,
): MessageDeliveryStatus {
  if (direction === "INBOUND") {
    return incoming;
  }
  if (incoming === "FAILED" || incoming === "UNDELIVERED") {
    return incoming;
  }
  if (OUTBOUND_STATUS_RANK[incoming] < OUTBOUND_STATUS_RANK[current]) {
    return current;
  }
  if (incoming === "QUEUED" || incoming === "SENDING") {
    return current === "QUEUED" || current === "SENDING" ? "SENT" : current;
  }
  return incoming;
}

async function findCustomersByE164(customerE164: string, companyId?: string) {
  const customers = await prisma.customer.findMany({
    ...(companyId ? { where: { companyId } } : {}),
    select: {
      id: true,
      companyId: true,
      phone: true,
      firstName: true,
      lastName: true,
      smsOptedOutAt: true,
    },
  });
  return customers.filter((c) => phonesMatchE164(c.phone, customerE164));
}

async function resolveInboundThread(params: {
  fromE164: string;
  toE164: string;
  messagingServiceSid?: string;
}) {
  const { fromE164, toE164, messagingServiceSid } = params;

  const threadCandidates = await prisma.messageThread.findMany({
    where: { customerAddress: fromE164 },
    orderBy: { lastMessageAt: "desc" },
  });

  if (threadCandidates.length > 0) {
    const exact = threadCandidates.find((t) => {
      if (t.twilioAddress === toE164) return true;
      if (messagingServiceSid && t.twilioAddress === `mg:${messagingServiceSid}`) {
        return true;
      }
      return false;
    });
    const thread = exact ?? threadCandidates[0]!;
    if (thread.twilioAddress !== toE164) {
      return prisma.messageThread.update({
        where: { id: thread.id },
        data: { twilioAddress: toE164 },
      });
    }
    return thread;
  }

  const defaultCompanyId = process.env.TWILIO_DEFAULT_COMPANY_ID?.trim();
  let customers = await findCustomersByE164(fromE164, defaultCompanyId || undefined);
  if (customers.length === 0 && !defaultCompanyId) {
    customers = await findCustomersByE164(fromE164);
  }

  let customer = customers.length === 1 ? customers[0] : undefined;
  if (!customer && defaultCompanyId && customers.length > 1) {
    customer = customers.find((c) => c.companyId === defaultCompanyId);
  }
  if (!customer && customers.length > 1) {
    const withRecentJob = await prisma.job.findFirst({
      where: { customerId: { in: customers.map((c) => c.id) } },
      orderBy: { updatedAt: "desc" },
      select: { customerId: true },
    });
    if (withRecentJob) {
      customer = customers.find((c) => c.id === withRecentJob.customerId);
    }
  }

  if (!customer) {
    return null;
  }

  return getOrCreateThread(customer.companyId, customer.id);
}

export async function getOrCreateThread(companyId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId },
  });
  if (!customer) {
    throw new Error("CUSTOMER_NOT_FOUND");
  }

  const customerAddress = normalizePhoneToE164(customer.phone);
  if (!customerAddress) {
    throw new Error("INVALID_CUSTOMER_PHONE");
  }

  const twilioAddress = getTwilioSenderAddress();
  if (!twilioAddress) {
    throw new Error("TWILIO_NOT_CONFIGURED");
  }

  const existing = await prisma.messageThread.findUnique({
    where: { companyId_customerId: { companyId, customerId } },
  });
  if (existing) {
    if (
      existing.customerAddress !== customerAddress ||
      existing.twilioAddress !== twilioAddress
    ) {
      return prisma.messageThread.update({
        where: { id: existing.id },
        data: { customerAddress, twilioAddress },
      });
    }
    return existing;
  }

  return prisma.messageThread.create({
    data: {
      companyId,
      customerId,
      customerAddress,
      twilioAddress,
    },
  });
}

type PersistMessageInput = {
  threadId: string;
  companyId: string;
  customerId: string;
  direction: MessageDirection;
  body: string;
  status: MessageDeliveryStatus;
  fromAddress: string;
  toAddress: string;
  twilioSid?: string | null;
  sentByUserId?: string | null;
  errorCode?: number | null;
  errorMessage?: string | null;
  incrementUnread?: boolean;
};

async function persistMessage(input: PersistMessageInput) {
  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.smsMessage.create({
      data: {
        threadId: input.threadId,
        companyId: input.companyId,
        customerId: input.customerId,
        direction: input.direction,
        body: input.body,
        status: input.status,
        fromAddress: input.fromAddress,
        toAddress: input.toAddress,
        twilioSid: input.twilioSid ?? null,
        sentByUserId: input.sentByUserId ?? null,
        errorCode: input.errorCode ?? null,
        errorMessage: input.errorMessage ?? null,
      },
    });

    await tx.messageThread.update({
      where: { id: input.threadId },
      data: {
        lastMessageAt: created.createdAt,
        lastMessagePreview: previewBody(input.body),
        ...(input.incrementUnread ? { unreadCount: { increment: 1 } } : {}),
      },
    });

    return created;
  });

  publishInboxEvent({
    type: "message.created",
    companyId: input.companyId,
    threadId: input.threadId,
    messageId: message.id,
  });
  publishInboxEvent({
    type: "thread.updated",
    companyId: input.companyId,
    threadId: input.threadId,
  });

  return message;
}

async function sendComplianceNoticeIfNeeded(
  companyId: string,
  customerId: string,
  to: string,
): Promise<void> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { smsComplianceNoticeSentAt: true, smsComplianceNoticePhone: true },
  });
  if (!customer) return;

  const alreadySent =
    customer.smsComplianceNoticeSentAt != null && customer.smsComplianceNoticePhone === to;
  if (alreadySent) return;

  const client = getTwilioClient();
  const fromFields = getTwilioMessageFromFields();
  if (!client || !fromFields) return;

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
  if (claim.count === 0) return;

  try {
    const complianceCallback = buildStatusCallbackUrl();
    const complianceOptions = {
      to,
      body: SMS_COMPLIANCE_NOTICE_BODY,
      ...fromFields,
      ...(complianceCallback ? { statusCallback: complianceCallback } : {}),
    } as Parameters<typeof client.messages.create>[0];
    const twilioMessage = await client.messages.create(complianceOptions);
    await logAutomatedOutboundSms({
      companyId,
      customerId,
      body: SMS_COMPLIANCE_NOTICE_BODY,
      twilioSid: twilioMessage.sid,
      status: mapOutboundStatusAfterAccept(twilioMessage.status),
      fromAddress: twilioMessage.from ?? getTwilioSenderAddress() ?? "",
      toAddress: to,
    });
  } catch {
    await prisma.customer.update({
      where: { id: customerId },
      data: { smsComplianceNoticeSentAt: null, smsComplianceNoticePhone: null },
    });
    throw new Error("COMPLIANCE_SMS_FAILED");
  }
}

export function buildStatusCallbackUrl(): string | undefined {
  const base = process.env.TWILIO_WEBHOOK_PUBLIC_URL?.trim() || process.env.API_PUBLIC_URL?.trim();
  if (!base) return undefined;
  return `${base.replace(/\/$/, "")}/api/twilio/webhook/status`;
}

/**
 * Records outbound SMS (automated job texts, compliance, staff replies) in the inbox thread.
 */
export async function logAutomatedOutboundSms(params: {
  companyId: string;
  customerId: string;
  body: string;
  twilioSid: string;
  status: MessageDeliveryStatus;
  fromAddress: string;
  toAddress: string;
}): Promise<void> {
  try {
    const thread = await getOrCreateThread(params.companyId, params.customerId);
    const existing = params.twilioSid
      ? await prisma.smsMessage.findUnique({ where: { twilioSid: params.twilioSid } })
      : null;
    if (existing) return;

    await persistMessage({
      threadId: thread.id,
      companyId: params.companyId,
      customerId: params.customerId,
      direction: "OUTBOUND",
      body: params.body,
      status: params.status,
      fromAddress: params.fromAddress,
      toAddress: params.toAddress,
      twilioSid: params.twilioSid,
      sentByUserId: null,
    });
  } catch (err) {
    console.error("Inbox: failed to log automated outbound SMS:", err);
  }
}

export async function sendStaffReply(params: {
  companyId: string;
  threadId: string;
  body: string;
  sentByUserId: string;
}): Promise<{ messageId: string }> {
  const trimmedBody = params.body.trim();
  if (!trimmedBody) {
    throw new Error("EMPTY_BODY");
  }

  if (!isTwilioMessagingConfigured()) {
    throw new Error("TWILIO_NOT_CONFIGURED");
  }

  const thread = await prisma.messageThread.findFirst({
    where: { id: params.threadId, companyId: params.companyId },
    include: { customer: true },
  });
  if (!thread) {
    throw new Error("THREAD_NOT_FOUND");
  }

  if (thread.customer.smsOptedOutAt) {
    throw new Error("CUSTOMER_OPTED_OUT");
  }

  const to = thread.customerAddress;
  const client = getTwilioClient();
  const fromFields = getTwilioMessageFromFields();
  if (!client || !fromFields) {
    throw new Error("TWILIO_NOT_CONFIGURED");
  }

  await sendComplianceNoticeIfNeeded(params.companyId, thread.customerId, to);

  const statusCallback = buildStatusCallbackUrl();
  const createOptions = {
    to,
    body: trimmedBody,
    ...fromFields,
    ...(statusCallback ? { statusCallback } : {}),
  } as Parameters<typeof client.messages.create>[0];
  const twilioMessage = await client.messages.create(createOptions);

  const fromAddress = twilioMessage.from ?? getTwilioSenderAddress() ?? "";
  const message = await persistMessage({
    threadId: thread.id,
    companyId: params.companyId,
    customerId: thread.customerId,
    direction: "OUTBOUND",
    body: trimmedBody,
    status: mapOutboundStatusAfterAccept(twilioMessage.status),
    fromAddress,
    toAddress: to,
    twilioSid: twilioMessage.sid,
    sentByUserId: params.sentByUserId,
    errorCode: twilioMessage.errorCode ?? null,
    errorMessage: twilioMessage.errorMessage ?? null,
  });

  if (
    twilioMessage.errorCode != null ||
    twilioMessage.status === "failed" ||
    twilioMessage.status === "undelivered"
  ) {
    throw new Error("TWILIO_SEND_FAILED");
  }

  return { messageId: message.id };
}

export async function processInboundSms(params: {
  from: string;
  to: string;
  body: string;
  messageSid: string;
  messagingServiceSid?: string;
}): Promise<void> {
  const fromE164 = normalizePhoneToE164(params.from);
  const toE164 = normalizePhoneToE164(params.to) ?? params.to.trim();
  if (!fromE164) {
    console.warn("Twilio inbound: could not normalize From:", params.from);
    return;
  }

  console.info("Twilio inbound SMS received:", {
    from: fromE164,
    to: toE164,
    messageSid: params.messageSid,
    bodyLength: params.body.length,
  });

  const bodyUpper = params.body.trim().toUpperCase();
  if (STOP_KEYWORDS.has(bodyUpper)) {
    const matches = await findCustomersByE164(fromE164);
    await prisma.customer.updateMany({
      where: { id: { in: matches.map((m) => m.id) } },
      data: { smsOptedOutAt: new Date() },
    });
  } else if (START_KEYWORDS.has(bodyUpper)) {
    const matches = await findCustomersByE164(fromE164);
    await prisma.customer.updateMany({
      where: { id: { in: matches.map((m) => m.id) } },
      data: { smsOptedOutAt: null },
    });
  }

  const thread = await resolveInboundThread({
    fromE164,
    toE164,
    ...(params.messagingServiceSid ? { messagingServiceSid: params.messagingServiceSid } : {}),
  });

  if (!thread) {
    console.warn("Twilio inbound: no customer/thread match for", fromE164, {
      hint: "Ensure the texting number matches a customer phone in your directory, or text after an outbound message created a thread.",
    });
    return;
  }

  const existing = await prisma.smsMessage.findUnique({
    where: { twilioSid: params.messageSid },
  });
  if (existing) return;

  await persistMessage({
    threadId: thread.id,
    companyId: thread.companyId,
    customerId: thread.customerId,
    direction: "INBOUND",
    body: params.body,
    status: "RECEIVED",
    fromAddress: fromE164,
    toAddress: toE164,
    twilioSid: params.messageSid,
    incrementUnread: true,
  });
}

export async function processStatusCallback(params: {
  messageSid: string;
  messageStatus: string;
  errorCode?: string;
  errorMessage?: string;
}): Promise<void> {
  const message = await prisma.smsMessage.findUnique({
    where: { twilioSid: params.messageSid },
  });
  if (!message) return;

  const incoming = mapTwilioStatusToDelivery(params.messageStatus, message.direction);
  const status = resolveStatusFromWebhook(message.status, incoming, message.direction);
  const errorCode = params.errorCode ? Number.parseInt(params.errorCode, 10) : null;

  await prisma.smsMessage.update({
    where: { id: message.id },
    data: {
      status,
      errorCode: Number.isFinite(errorCode) ? errorCode : null,
      errorMessage: params.errorMessage ?? null,
    },
  });

  publishInboxEvent({
    type: "message.status",
    companyId: message.companyId,
    threadId: message.threadId,
    messageId: message.id,
  });
}

export async function listThreads(companyId: string) {
  return prisma.messageThread.findMany({
    where: { companyId },
    orderBy: { lastMessageAt: "desc" },
    include: {
      customer: {
        select: { id: true, firstName: true, lastName: true, phone: true, smsOptedOutAt: true },
      },
    },
  });
}

export async function listThreadMessages(
  companyId: string,
  threadId: string,
  limit = 50,
  before?: string,
) {
  const thread = await prisma.messageThread.findFirst({
    where: { id: threadId, companyId },
  });
  if (!thread) {
    throw new Error("THREAD_NOT_FOUND");
  }

  const messages = await prisma.smsMessage.findMany({
    where: {
      threadId,
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      sentBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  return { thread, messages: messages.reverse() };
}

export async function markThreadRead(companyId: string, threadId: string): Promise<void> {
  const thread = await prisma.messageThread.findFirst({
    where: { id: threadId, companyId },
  });
  if (!thread) {
    throw new Error("THREAD_NOT_FOUND");
  }

  await prisma.messageThread.update({
    where: { id: threadId },
    data: { unreadCount: 0 },
  });

  publishInboxEvent({ type: "thread.updated", companyId, threadId });
}

export async function getOrCreateThreadForCustomer(companyId: string, customerId: string) {
  return getOrCreateThread(companyId, customerId);
}
