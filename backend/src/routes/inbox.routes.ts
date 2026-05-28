import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import {
  getInboxThreadMessages,
  inboxEventsStream,
  listInboxThreads,
  markInboxThreadRead,
  openInboxThreadForCustomer,
  sendInboxMessage,
} from "../controllers/inbox.controllers";

const router = express.Router();

const inboxRoles = requireRole("admin", "dispatcher", "technician");

router.get("/threads", requireAuth, inboxRoles, listInboxThreads);
router.get("/threads/:threadId/messages", requireAuth, inboxRoles, getInboxThreadMessages);
router.post("/threads/open", requireAuth, inboxRoles, openInboxThreadForCustomer);
router.post("/threads/:threadId/send", requireAuth, inboxRoles, sendInboxMessage);
router.post("/threads/:threadId/read", requireAuth, inboxRoles, markInboxThreadRead);
router.get("/events", inboxEventsStream);

export default router;
