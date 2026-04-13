import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { createJobInvoice, getJobInvoice } from "../controllers/invoice.controllers";

const router = express.Router();

router.post(
  "/create",
  requireAuth,
  requireRole("admin", "dispatcher", "technician"),
  createJobInvoice
);
router.get(
  "/job",
  requireAuth,
  requireRole("admin", "dispatcher", "technician"),
  getJobInvoice
);

export default router;
