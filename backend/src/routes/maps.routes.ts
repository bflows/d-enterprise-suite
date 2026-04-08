import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { getStreetViewForAddress } from "../controllers/maps.controllers";

const router = express.Router();

router.get(
  "/street-view",
  requireAuth,
  requireRole("admin", "dispatcher", "technician"),
  getStreetViewForAddress
);

export default router;
