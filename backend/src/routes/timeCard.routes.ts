import express from "express";
import { ALL_ROLE_SLUGS } from "../constants/roles";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import {
  clockIn,
  clockOut,
  getActiveTimeCard,
  getRecentTimeCards,
} from "../controllers/timeCard.controllers";

const router = express.Router();

router.get("/recent", requireAuth, requireRole(...ALL_ROLE_SLUGS), getRecentTimeCards);
router.get("/active", requireAuth, requireRole(...ALL_ROLE_SLUGS), getActiveTimeCard);
router.post("/clock-in", requireAuth, requireRole(...ALL_ROLE_SLUGS), clockIn);
router.post("/clock-out", requireAuth, requireRole(...ALL_ROLE_SLUGS), clockOut);

export default router;
