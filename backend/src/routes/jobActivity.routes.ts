import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { listJobActivities } from "../controllers/jobActivity.controllers";

const router = express.Router();

router.post(
  "/list",
  requireAuth,
  requireRole("admin", "dispatcher", "technician"),
  listJobActivities
);

export default router;
