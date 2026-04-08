import express from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import {
  createJob,
  listJobs,
  listTechnicianJobs,
  deleteJob,
  updateJob,
  updateJobStatus,
  uploadPhotoToJob,
  listJobPhotos,
  deleteJobPhoto,
} from "../controllers/job.controllers";
import { uploadJobPhoto } from "../middleware/upload.middleware";

const router = express.Router();

router.get("/", requireAuth, requireRole("admin", "dispatcher", "technician"), listJobs);
router.post(
  "/technician",
  requireAuth,
  requireRole("technician"),
  listTechnicianJobs
);
router.post("/create", requireAuth, requireRole("admin", "dispatcher", "technician"), createJob);
router.put("/update", requireAuth, requireRole("admin", "dispatcher", "technician"), updateJob);
router.put(
  "/status",
  requireAuth,
  requireRole("admin", "dispatcher", "technician"),
  updateJobStatus
);
router.get(
  "/:jobId/photos",
  requireAuth,
  requireRole("admin", "dispatcher", "technician"),
  listJobPhotos
);
router.post(
  "/:jobId/photos",
  requireAuth,
  requireRole("admin", "dispatcher", "technician"),
  uploadJobPhoto.single("file"),
  uploadPhotoToJob
);
router.delete(
  "/:jobId/photos/:photoId",
  requireAuth,
  requireRole("admin", "dispatcher", "technician"),
  deleteJobPhoto
);
router.delete("/delete", requireAuth, requireRole("admin", "dispatcher", "technician"), deleteJob);

export default router;
