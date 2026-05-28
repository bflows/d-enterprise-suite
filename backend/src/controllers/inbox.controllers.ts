import type { Request, Response } from "express";
import { verifyAccessToken } from "../services/token.service";
import { subscribeInboxEvents } from "../services/inboxRealtime.service";
import {
  getOrCreateThreadForCustomer,
  listThreadMessages,
  listThreads,
  markThreadRead,
  sendStaffReply,
} from "../services/inboxSms.service";

function requireBusiness(req: Request, res: Response): string | null {
  if (!req.business?.id) {
    res.status(403).json({ success: false, message: "No business context." });
    return null;
  }
  return req.business.id;
}

export const listInboxThreads = async (req: Request, res: Response) => {
  try {
    const companyId = requireBusiness(req, res);
    if (!companyId) return;

    const threads = await listThreads(companyId);
    return res.status(200).json({
      success: true,
      threads: threads.map((t: Awaited<ReturnType<typeof listThreads>>[number]) => ({
        id: t.id,
        customerId: t.customerId,
        customer: t.customer,
        lastMessageAt: t.lastMessageAt.toISOString(),
        lastMessagePreview: t.lastMessagePreview,
        unreadCount: t.unreadCount,
      })),
    });
  } catch (error) {
    console.error("listInboxThreads error:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const getInboxThreadMessages = async (req: Request, res: Response) => {
  try {
    const companyId = requireBusiness(req, res);
    if (!companyId) return;

    const threadId = typeof req.params.threadId === "string" ? req.params.threadId : "";
    if (!threadId) {
      return res.status(400).json({ success: false, message: "threadId is required." });
    }

    const before = typeof req.query.before === "string" ? req.query.before : undefined;
    const limitRaw = typeof req.query.limit === "string" ? Number.parseInt(req.query.limit, 10) : 50;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50;

    const { thread, messages } = await listThreadMessages(companyId, threadId, limit, before);

    return res.status(200).json({
      success: true,
      thread: {
        id: thread.id,
        customerId: thread.customerId,
        unreadCount: thread.unreadCount,
      },
      messages: messages.map((m: Awaited<ReturnType<typeof listThreadMessages>>["messages"][number]) => ({
        id: m.id,
        direction: m.direction,
        body: m.body,
        status: m.status,
        createdAt: m.createdAt.toISOString(),
        sentBy: m.sentBy
          ? { id: m.sentBy.id, firstName: m.sentBy.firstName, lastName: m.sentBy.lastName }
          : null,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "THREAD_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Thread not found." });
    }
    console.error("getInboxThreadMessages error:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const openInboxThreadForCustomer = async (req: Request, res: Response) => {
  try {
    const companyId = requireBusiness(req, res);
    if (!companyId) return;

    const customerId = typeof req.body.customerId === "string" ? req.body.customerId.trim() : "";
    if (!customerId) {
      return res.status(400).json({ success: false, message: "customerId is required." });
    }

    const thread = await getOrCreateThreadForCustomer(companyId, customerId);
    return res.status(200).json({
      success: true,
      thread: { id: thread.id, customerId: thread.customerId },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "CUSTOMER_NOT_FOUND") {
        return res.status(404).json({ success: false, message: "Customer not found." });
      }
      if (error.message === "INVALID_CUSTOMER_PHONE") {
        return res.status(400).json({ success: false, message: "Customer phone is invalid for SMS." });
      }
      if (error.message === "TWILIO_NOT_CONFIGURED") {
        return res.status(503).json({ success: false, message: "SMS is not configured." });
      }
    }
    console.error("openInboxThreadForCustomer error:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const sendInboxMessage = async (req: Request, res: Response) => {
  try {
    const companyId = requireBusiness(req, res);
    if (!companyId) return;
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const threadId = typeof req.params.threadId === "string" ? req.params.threadId : "";
    const body = typeof req.body.body === "string" ? req.body.body : "";
    if (!threadId) {
      return res.status(400).json({ success: false, message: "threadId is required." });
    }

    const result = await sendStaffReply({
      companyId,
      threadId,
      body,
      sentByUserId: req.user.id,
    });

    return res.status(201).json({ success: true, messageId: result.messageId });
  } catch (error) {
    if (error instanceof Error) {
      const map: Record<string, { status: number; message: string }> = {
        EMPTY_BODY: { status: 400, message: "Message body is required." },
        THREAD_NOT_FOUND: { status: 404, message: "Thread not found." },
        CUSTOMER_OPTED_OUT: { status: 403, message: "Customer has opted out of SMS (STOP)." },
        TWILIO_NOT_CONFIGURED: { status: 503, message: "SMS is not configured." },
        TWILIO_SEND_FAILED: { status: 502, message: "Failed to send SMS via Twilio." },
      };
      const hit = map[error.message];
      if (hit) {
        return res.status(hit.status).json({ success: false, message: hit.message });
      }
    }
    console.error("sendInboxMessage error:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

export const markInboxThreadRead = async (req: Request, res: Response) => {
  try {
    const companyId = requireBusiness(req, res);
    if (!companyId) return;

    const threadId = typeof req.params.threadId === "string" ? req.params.threadId : "";
    if (!threadId) {
      return res.status(400).json({ success: false, message: "threadId is required." });
    }

    await markThreadRead(companyId, threadId);
    return res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "THREAD_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Thread not found." });
    }
    console.error("markInboxThreadRead error:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

/**
 * SSE stream for inbox updates. Auth via `token` query param (EventSource cannot send Authorization header).
 */
export const inboxEventsStream = async (req: Request, res: Response) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  const companyId = typeof req.query.companyId === "string" ? req.query.companyId : "";

  if (!token || !companyId) {
    res.status(401).json({ success: false, message: "token and companyId are required." });
    return;
  }

  let payload: ReturnType<typeof verifyAccessToken>;
  try {
    payload = verifyAccessToken(token);
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired token." });
    return;
  }

  if (payload.companyId && payload.companyId !== companyId) {
    res.status(403).json({ success: false, message: "Token company mismatch." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send({ type: "connected" });

  const unsubscribe = subscribeInboxEvents(companyId, (event) => {
    send(event);
  });

  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  });
};
