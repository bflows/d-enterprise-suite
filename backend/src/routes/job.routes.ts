import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { createJob, listJobs, deleteJob, updateJob } from "../controllers/job.controllers";

const router = express.Router();

router.get("/", requireAuth, requireRole("admin", "dispatcher", "technician"), listJobs);
router.post("/create", requireAuth, requireRole("admin", "dispatcher", "technician"), createJob);
router.put("/update", requireAuth, requireRole("admin", "dispatcher", "technician"), updateJob);
router.delete("/delete", requireAuth, requireRole("admin", "dispatcher", "technician"), deleteJob);

export default router;
