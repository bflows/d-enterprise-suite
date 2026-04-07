import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import {
  clockIn,
  clockOut,
  getActiveTimeCard,
  getRecentTimeCards,
} from "../controllers/timeCard.controllers";

const router = express.Router();

router.get("/recent", requireAuth, requireRole("admin", "dispatcher", "technician"), getRecentTimeCards);
router.get("/active", requireAuth, requireRole("admin", "dispatcher", "technician"), getActiveTimeCard);
router.post("/clock-in", requireAuth, requireRole("admin", "dispatcher", "technician"), clockIn);
router.post("/clock-out", requireAuth, requireRole("admin", "dispatcher", "technician"), clockOut);

export default router;
