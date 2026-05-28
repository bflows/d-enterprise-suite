import type { Request, Response } from "express";
import { validateTwilioWebhookRequest } from "../lib/twilioWebhook";
import { processInboundSms, processStatusCallback } from "../services/inboxSms.service";

function twimlEmptyResponse(res: Response): void {
  res.type("text/xml");
  res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
}

export const handleTwilioInboundSms = async (req: Request, res: Response): Promise<void> => {
  if (!validateTwilioWebhookRequest(req)) {
    res.status(403).send("Forbidden");
    return;
  }

  const from = typeof req.body.From === "string" ? req.body.From : "";
  const to = typeof req.body.To === "string" ? req.body.To : "";
  const body = typeof req.body.Body === "string" ? req.body.Body : "";
  const messageSid = typeof req.body.MessageSid === "string" ? req.body.MessageSid : "";
  const messagingServiceSid =
    typeof req.body.MessagingServiceSid === "string" ? req.body.MessagingServiceSid : undefined;

  if (!from || !messageSid) {
    twimlEmptyResponse(res);
    return;
  }

  try {
    await processInboundSms({ from, to, body, messageSid, messagingServiceSid });
  } catch (err) {
    console.error("Twilio inbound SMS handler error:", err);
  }

  twimlEmptyResponse(res);
};

export const handleTwilioStatusCallback = async (req: Request, res: Response): Promise<void> => {
  if (!validateTwilioWebhookRequest(req)) {
    res.status(403).send("Forbidden");
    return;
  }

  const messageSid = typeof req.body.MessageSid === "string" ? req.body.MessageSid : "";
  const messageStatus = typeof req.body.MessageStatus === "string" ? req.body.MessageStatus : "";
  const errorCode = typeof req.body.ErrorCode === "string" ? req.body.ErrorCode : undefined;
  const errorMessage = typeof req.body.ErrorMessage === "string" ? req.body.ErrorMessage : undefined;

  if (messageSid && messageStatus) {
    try {
      await processStatusCallback({ messageSid, messageStatus, errorCode, errorMessage });
    } catch (err) {
      console.error("Twilio status callback error:", err);
    }
  }

  res.status(200).send("");
};
