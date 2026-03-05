import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { createJob, listJobs, deleteJob, updateJob } from "../controllers/job.controllers";

const router = express.Router();

router.get("/", requireAuth, requireRole("dispatcher", "admin", "technician"), listJobs);
router.post("/create", requireAuth, requireRole("dispatcher", "admin"), createJob);
router.put("/update", requireAuth, requireRole("dispatcher", "admin"), updateJob);
router.delete("/delete", requireAuth, requireRole("dispatcher", "admin"), deleteJob);

export default router;
