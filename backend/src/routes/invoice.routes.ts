import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import {
  createJobInvoice,
  getInvoiceStripeConfig,
  getJobInvoice,
  markJobInvoicePaidOutOfBand,
  payJobInvoiceWithCard,
} from "../controllers/invoice.controllers";

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
router.get(
  "/stripe-config",
  requireAuth,
  requireRole("admin", "dispatcher", "technician"),
  getInvoiceStripeConfig
);
router.post(
  "/job/mark-paid",
  requireAuth,
  requireRole("admin", "dispatcher", "technician"),
  markJobInvoicePaidOutOfBand
);
router.post(
  "/job/pay-card",
  requireAuth,
  requireRole("admin", "dispatcher", "technician"),
  payJobInvoiceWithCard
);

export default router;
