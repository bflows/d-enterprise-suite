import type { Request, Response } from "express";
import type { UploadApiResponse } from "cloudinary";
import type { JobActivityType, JobPhotoSource, JobStatusType } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { cloudinary } from "../lib/cloudinary";
import { getStripe } from "../lib/stripe";
import { syncJobsInvoiceStatusesFromStripe } from "../lib/stripeInvoiceJobSync";
import {
  sendJobRescheduleReminderEmail,
  sendJobScheduledConfirmationEmail,
} from "../services/jobConfirmationEmail";
import type { JobConfirmationEmailPayload } from "../services/jobConfirmationEmail";
import { sendJobCreatedCustomerSms } from "../services/jobScheduledSms";

/** Request body for updating a job. Only provided fields are updated. */
interface UpdateJobBody {
  id: string;
  title?: string | null;
  date?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  /** @deprecated End time is computed from start time and service item durations. Ignored if sent. */
  endTime?: string;
  notes?: string | null;
  status?: "scheduled" | "en_route" | "in_progress" | "completed" | "cancelled";
  technicianId?: string;
  /** IDs of service items to attach to this job. Replaces existing services when provided. */
  serviceItemIds?: string[];
}

interface UpdateJobStatusBody {
  id?: string;
  jobId?: string;
  companyId?: string;
  userId?: string;
  status: JobStatusType;
}

interface UploadJobPhotoBody {
  source?: "camera_roll" | "live_camera" | "library";
}

/** Request body for listing jobs assigned to the technician (employee) for this user + company. */
interface ListTechnicianJobsBody {
  userId: string;
  companyId: string;
}

/** Request body for creating a job. Frontend sends date as YYYY-MM-DD and startTime as HH:mm. End time is derived from service item durations. */
interface CreateJobBody {
  companyId: string;
  customerId: string;
  technicianId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  /** @deprecated Ignored. End time is computed from `startTime` and total service item duration. */
  endTime?: string;
  notes?: string;
  leadSource?: string;
  /** Optional initial status; defaults to SCHEDULED. */
  status?: "scheduled" | "en_route" | "in_progress" | "completed" | "cancelled";
  /** IDs of service items (from Service Book) to attach to this job. First item's title is used as job title. */
  serviceItemIds?: string[];
}

/**
 * Parse "YYYY-MM-DD" and "HH:mm" into a Date (same day, time from HH:mm).
 * Returns null if timeStr is empty or not valid HH:mm.
 */
function toDateTime(dateStr: string, timeStr: string): Date | null {
  if (!timeStr || typeof timeStr !== "string") return null;
  const parts = timeStr.trim().split(":");
  const hours = parseInt(parts[0] ?? "", 10);
  const minutes = parseInt(parts[1] ?? "", 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  const d = new Date(dateStr + "T00:00:00");
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function addMinutesToDateTime(start: Date, minutes: number): Date {
  const d = new Date(start.getTime());
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

function totalMinutesFromServiceRows(
  services: { duration: number; unit: number | null; quantity: number }[]
): number {
  return services.reduce(
    (sum, s) =>
      sum + s.duration * Math.max(1, s.unit ?? 1) * Math.max(1, s.quantity),
    0
  );
}

/** Resolves and sums `duration * quantity` for each id (order preserved; duplicate ids add twice). */
async function totalMinutesForServiceItemIds(
  companyId: string,
  serviceIds: string[]
): Promise<{ totalMinutes: number; error: string | null }> {
  if (serviceIds.length === 0) {
    return { totalMinutes: 0, error: null };
  }
  const items = await prisma.serviceItem.findMany({
    where: {
      id: { in: serviceIds },
      category: { serviceBook: { companyId } },
    },
    select: { id: true, duration: true, quantity: true, unit: true },
  });
  const byId = new Map(items.map((i) => [i.id, i] as const));
  let total = 0;
  for (const id of serviceIds) {
    const row = byId.get(id);
    if (!row) {
      return {
        totalMinutes: 0,
        error:
          "One or more service items are invalid or do not belong to this company.",
      };
    }
    total += row.duration * Math.max(1, row.unit ?? 1) * Math.max(1, row.quantity);
  }
  return { totalMinutes: total, error: null };
}

/** True if another job for the same technician overlaps [windowStart, windowEnd). End times follow service-line durations. */
async function technicianHasScheduleConflict(
  companyId: string,
  technicianId: string,
  excludeJobId: string,
  windowStart: Date,
  windowEnd: Date
): Promise<boolean> {
  const others = await prisma.job.findMany({
    where: {
      companyId,
      technicianId,
      id: { not: excludeJobId },
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    },
    select: {
      startTime: true,
      services: { select: { duration: true, unit: true, quantity: true } },
    },
  });
  const wStart = windowStart.getTime();
  const wEnd = windowEnd.getTime();
  for (const o of others) {
    const oEnd = addMinutesToDateTime(
      o.startTime,
      totalMinutesFromServiceRows(o.services)
    );
    if (wStart < oEnd.getTime() && wEnd > o.startTime.getTime()) {
      return true;
    }
  }
  return false;
}

/** Maps API/frontend snake_case statuses to Prisma `JobStatusType` (replaces legacy IN_PROGRESS with ON_SITE). */
const STATUS_MAP: Record<string, JobStatusType> = {
  scheduled: "SCHEDULED",
  en_route: "EN_ROUTE",
  in_progress: "ON_SITE",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
};

const ALLOWED_JOB_STATUSES: JobStatusType[] = [
  "SCHEDULED",
  "EN_ROUTE",
  "ON_SITE",
  "COMPLETED",
  "CANCELLED",
];

const PHOTO_SOURCE_MAP: Record<string, JobPhotoSource> = {
  camera_roll: "CAMERA_ROLL",
  live_camera: "LIVE_CAMERA",
  library: "LIBRARY",
};

function normalizePhotoSource(input?: string): JobPhotoSource {
  if (!input) return "LIBRARY";
  const normalized = input.toLowerCase().trim();
  return PHOTO_SOURCE_MAP[normalized] ?? "LIBRARY";
}

function uploadBufferToCloudinary(
  fileBuffer: Buffer,
  folder: string
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed."));
          return;
        }
        resolve(result);
      }
    );

    stream.end(fileBuffer);
  });
}

/**
 * Create a job. Sets job title to the first ServiceItem's title when serviceItemIds are provided,
 * so the schedule shows a concise label (e.g. "AC Repair") until the user opens the job for details.
 */
export const createJob = async (
  req: Request<{}, {}, CreateJobBody>,
  res: Response
) => {
  try {
    const {
      companyId,
      customerId,
      technicianId,
      date: dateStr,
      startTime: startTimeStr,
      notes,
      leadSource,
      status: statusFromBody,
      serviceItemIds,
    } = req.body;

    if (
      !companyId ||
      !customerId ||
      !technicianId ||
      !dateStr ||
      !startTimeStr
    ) {
      return res.status(400).json({
        success: false,
        message:
          "companyId, customerId, technicianId, date, and startTime are required.",
      });
    }
    if (!serviceItemIds || serviceItemIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one service item is required.",
      });
    }

    let title: string | null = null;
    if (serviceItemIds && serviceItemIds.length > 0) {
      const firstId = serviceItemIds[0];
      if (firstId !== undefined) {
        const firstServiceItem = await prisma.serviceItem.findUnique({
          where: { id: firstId },
          select: { title: true },
        });
        if (firstServiceItem) {
          title = firstServiceItem.title;
        }
      }
    }

    const day = new Date(dateStr + "T00:00:00");
    const startTime = toDateTime(dateStr, startTimeStr);
    if (!startTime) {
      return res.status(400).json({
        success: false,
        message: "startTime must be valid (HH:mm).",
      });
    }
    const { totalMinutes, error: durationError } = await totalMinutesForServiceItemIds(
      companyId,
      serviceItemIds
    );
    if (durationError) {
      return res.status(400).json({
        success: false,
        message: durationError,
      });
    }
    const endTime = addMinutesToDateTime(startTime, totalMinutes);

    const mappedStatus = statusFromBody !== undefined ? STATUS_MAP[statusFromBody] : undefined;
    const status: JobStatusType = mappedStatus ?? "SCHEDULED";

    const actorUserId = req.user?.id ?? null;
    const dayLabel = `${day.getMonth() + 1}/${day.getDate()}`;
    const logName = `Job: Scheduled ${dayLabel}`;
    const { job, log } = await prisma.$transaction(async (tx) => {
      const job = await tx.job.create({
        data: {
          companyId,
          customerId,
          technicianId,
          title,
          notes: notes ?? null,
          leadSource: leadSource ?? null,
          status,
          date: day,
          startTime,
          endTime,
          services: {
            connect: serviceItemIds.map((id) => ({ id })),
          },
        },
        include: {
          company: { select: { name: true } },
          customer: true,
          technician: { include: { user: true } },
          services: true,
          invoice: true,
        },
      });

      const log = await tx.jobActivity.create({
        data: {
          jobId: job.id,
          companyId,
          type: "JOB_CREATED" as JobActivityType,
          logName,
          userId: actorUserId,
        },
      });

      return { job, log };
    });

    if (status === "SCHEDULED") {
      void sendJobScheduledConfirmationEmail(job).catch((err) => {
        console.error("Job confirmation email error:", err);
      });
      void sendJobCreatedCustomerSms(job).catch((err) => {
        console.error("Job confirmation SMS error:", err);
      });
    }

    return res.status(201).json({
      success: true,
      message: "Job created successfully",
      job,
      log
    });
  } catch (error) {
    console.error("Create job error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

/**
 * Update a job by id. Only provided body fields are updated. Job must belong to company.
 */
export const updateJob = async (
  req: Request<{}, {}, UpdateJobBody>,
  res: Response
) => {
  try {
    const companyId = req.business?.id;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company context is required.",
      });
    }
    const { id, ...body } = req.body;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "id is required.",
      });
    }
    const existing = await prisma.job.findFirst({
      where: { id, companyId },
      include: {
        services: { select: { id: true, duration: true, quantity: true, unit: true } } },
    });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }
    const dateStr = (d: Date) => d.toISOString().slice(0, 10);
    const data: {
      title?: string | null;
      notes?: string | null;
      status?: JobStatusType;
      date?: Date;
      startTime?: Date;
      endTime?: Date;
      technicianId?: string;
    } = {};
    if (body.title !== undefined) data.title = body.title ?? null;
    if (body.notes !== undefined) data.notes = body.notes ?? null;
    if (body.status !== undefined) {
      const prismaStatus = STATUS_MAP[body.status];
      if (!prismaStatus) {
        return res.status(400).json({
          success: false,
          message: "Invalid status.",
        });
      }
      data.status = prismaStatus;
    }
    if (body.date !== undefined) data.date = new Date(body.date + "T00:00:00");
    if (body.startTime !== undefined) {
      const dateKey = body.date ?? dateStr(existing.date);
      const parsed = toDateTime(dateKey, body.startTime);
      if (!parsed) {
        return res.status(400).json({
          success: false,
          message: "startTime must be valid (HH:mm).",
        });
      }
      data.startTime = parsed;
    }
    if (body.technicianId !== undefined) {
      const technician = await prisma.employee.findFirst({
        where: { id: body.technicianId, companyId },
      });
      if (!technician) {
        return res.status(400).json({
          success: false,
          message: "Technician not found or does not belong to this company.",
        });
      }
      data.technicianId = body.technicianId;
    }
    if (body.serviceItemIds !== undefined) {
      (data as Record<string, unknown>).services = {
        set: body.serviceItemIds.map((id) => ({ id })),
      };
    }

    const shouldRecomputeEndTime =
      body.startTime !== undefined ||
      body.date !== undefined ||
      body.serviceItemIds !== undefined;

    if (shouldRecomputeEndTime) {
      const startForEnd = data.startTime ?? existing.startTime;
      let totalMinutes: number;
      if (body.serviceItemIds !== undefined) {
        const { totalMinutes: t, error: durationError } =
          await totalMinutesForServiceItemIds(companyId, body.serviceItemIds);
        if (durationError) {
          return res.status(400).json({
            success: false,
            message: durationError,
          });
        }
        totalMinutes = t;
      } else {
        totalMinutes = totalMinutesFromServiceRows(existing.services);
      }
      data.endTime = addMinutesToDateTime(startForEnd, totalMinutes);
    }

    const scheduleOrAssignmentChanged =
      body.technicianId !== undefined ||
      body.date !== undefined ||
      body.startTime !== undefined ||
      body.serviceItemIds !== undefined;

    if (scheduleOrAssignmentChanged) {
      const candidateTechId = data.technicianId ?? existing.technicianId;
      const effectiveStart = data.startTime ?? existing.startTime;
      const effectiveEnd =
        data.endTime !== undefined
          ? data.endTime
          : addMinutesToDateTime(
              effectiveStart,
              totalMinutesFromServiceRows(existing.services)
            );
      const conflict = await technicianHasScheduleConflict(
        companyId,
        candidateTechId,
        id,
        effectiveStart,
        effectiveEnd
      );
      if (conflict) {
        return res.status(409).json({
          success: false,
          message:
            "This technician already has another job that overlaps this time (based on start time and service durations).",
        });
      }
    }

    const effectiveDate = data.date ?? existing.date;
    const effectiveStartTime = data.startTime ?? existing.startTime;
    const effectiveEndTime = data.endTime ?? existing.endTime;
    const scheduleChanged =
      effectiveDate.getTime() !== existing.date.getTime() ||
      effectiveStartTime.getTime() !== existing.startTime.getTime() ||
      effectiveEndTime.getTime() !== existing.endTime.getTime();

    const job = await prisma.job.update({
      where: { id },
      data,
      include: {
        company: { select: { name: true } },
        customer: true,
        technician: { include: { user: true } },
        services: true,
        invoice: true,
      },
    });

    if (scheduleChanged) {
      const statusAfter = job.status;
      if (statusAfter !== "CANCELLED" && statusAfter !== "COMPLETED") {
        const emailPayload: JobConfirmationEmailPayload = {
          id: job.id,
          company: job.company,
          customer: {
            firstName: job.customer.firstName,
            lastName: job.customer.lastName,
            email: job.customer.email,
            phone: job.customer.phone,
          },
          technician: {
            user: {
              firstName: job.technician.user.firstName,
              lastName: job.technician.user.lastName,
            },
          },
          services: job.services.map((s) => ({ title: s.title })),
          date: job.date,
          startTime: job.startTime,
          endTime: job.endTime,
        };
        void sendJobRescheduleReminderEmail(emailPayload).catch((err) => {
          console.error("Job reschedule reminder email error:", err);
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Job updated successfully",
      job,
    });
  } catch (error) {
    console.error("Update job error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

/**
 * Delete a job by id. Returns 404 if not found or not in company. Id in req.body.
 */
export const deleteJob = async (
  req: Request<{}, {}, { id: string }>,
  res: Response
) => {
  try {
    const companyId = req.business?.id;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company context is required.",
      });
    }

    const { id } = req.body;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "id is required.",
      });
    }
    const existing = await prisma.job.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    await prisma.job.delete({ where: { id } });
    return res.status(200).json({
      success: true,
      message: "Job deleted successfully.",
    });
  } catch (error) {
    console.error("Delete job error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

/**
 * List jobs assigned to the authenticated technician for the given user + company.
 * Body must match the session (userId === req.user.id, companyId === req.business.id).
 */
export const listTechnicianJobs = async (
  req: Request<{}, {}, ListTechnicianJobsBody>,
  res: Response
) => {
  try {
    const { userId, companyId } = req.body;
    if (!userId || !companyId) {
      return res.status(400).json({
        success: false,
        message: "userId and companyId are required.",
      });
    }
    if (!req.user || !req.business) {
      return res.status(401).json({
        success: false,
        message: "Authentication and company context are required.",
      });
    }
    if (userId !== req.user.id || companyId !== req.business.id) {
      return res.status(403).json({
        success: false,
        message: "userId and companyId must match the signed-in user and current company.",
      });
    }

    const employee = await prisma.employee.findFirst({
      where: { userId, companyId },
      select: { id: true },
    });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee record not found for this user and company.",
      });
    }

    let jobs = await prisma.job.findMany({
      where: { companyId, technicianId: employee.id },
      include: {
        customer: true,
        technician: { include: { user: true } },
        services: true,
        invoice: true,
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    const stripe = getStripe();
    if (stripe && jobs.some((j) => j.invoice?.stripeInvoiceId)) {
      await syncJobsInvoiceStatusesFromStripe(stripe, jobs);
      jobs = await prisma.job.findMany({
        where: { companyId, technicianId: employee.id },
        include: {
          customer: true,
          technician: { include: { user: true } },
          services: true,
          invoice: true,
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      });
    }

    return res.status(200).json({ jobs });
  } catch (error) {
    console.error("List technician jobs error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

/**
 * List jobs for the current company (req.business.id). Used by the schedule to show all jobs.
 */
export const listJobs = async (req: Request, res: Response) => {
  try {
    const companyId = req.business?.id;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company context is required.",
      });
    }

    const customerIdRaw = req.query.customerId;
    const customerId =
      typeof customerIdRaw === "string" && customerIdRaw.trim() ? customerIdRaw.trim() : undefined;

    let jobs = await prisma.job.findMany({
      where: customerId ? { companyId, customerId } : { companyId },
      include: {
        customer: true,
        technician: { include: { user: true } },
        services: true,
        invoice: true,
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    const stripe = getStripe();
    if (stripe && jobs.some((j) => j.invoice?.stripeInvoiceId)) {
      await syncJobsInvoiceStatusesFromStripe(stripe, jobs);
      jobs = await prisma.job.findMany({
        where: customerId ? { companyId, customerId } : { companyId },
        include: {
          customer: true,
          technician: { include: { user: true } },
          services: true,
          invoice: true,
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      });
    }

    return res.status(200).json({ jobs });
  } catch (error) {
    console.error("List jobs error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

/**
 * Update only the status of a job.
 * Expects job id and status in request body (no route params).
 */
export const updateJobStatus = async (
  req: Request<{}, {}, UpdateJobStatusBody>,
  res: Response
) => {
  try {
    const companyId = req.business?.id;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company context is required.",
      });
    }

    const { id, jobId, status, companyId: companyIdFromBody, userId: userIdFromBody } = req.body;
    const resolvedJobId = jobId ?? id;
    const sessionUserId = req.user?.id;

    if (!resolvedJobId) {
      return res.status(400).json({
        success: false,
        message: "Job id is required.",
      });
    }
    if (companyIdFromBody && companyIdFromBody !== companyId) {
      return res.status(403).json({
        success: false,
        message: "companyId must match the signed-in company.",
      });
    }

    if (userIdFromBody && sessionUserId && userIdFromBody !== sessionUserId) {
      return res.status(403).json({
        success: false,
        message: "userId must match the signed-in user.",
      });
    }


    if (!status || !ALLOWED_JOB_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Allowed values: SCHEDULED, EN_ROUTE, ON_SITE, COMPLETED, CANCELLED.",
      });
    }

    if (status === "COMPLETED" && (!companyIdFromBody || !userIdFromBody || !resolvedJobId)) {
      return res.status(400).json({
        success: false,
        message: "companyId, userId, and jobId are required when status is COMPLETED.",
      });
    }

    const existing = await prisma.job.findFirst({
      where: { id: resolvedJobId, companyId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    const job = await prisma.$transaction(async (tx) => {
      const updatedJob = await tx.job.update({
        where: { id: resolvedJobId },
        data: { status },
        include: {
          customer: true,
          technician: { include: { user: true } },
          services: true,
          invoice: true,
        },
      });

      if (status === "EN_ROUTE") {
        await tx.jobActivity.create({
          data: {
            companyId,
            jobId: resolvedJobId,
            userId: userIdFromBody ?? sessionUserId ?? null,
            type: "JOB_STATUS_UPDATED",
            logName: "Job: On my way",
          },
        });
      }

      if (status === "ON_SITE") {
        await tx.jobActivity.create({
          data: {
            companyId: companyIdFromBody ?? companyId,
            jobId: resolvedJobId,
            userId: userIdFromBody ?? sessionUserId ?? null,
            type: "JOB_STATUS_UPDATED",
            logName: "Job: On site",
          },
        });
      }

      if (status === "COMPLETED") {
        await tx.jobActivity.create({
          data: {
            companyId: companyIdFromBody!,
            jobId: resolvedJobId,
            userId: userIdFromBody!,
            type: "JOB_STATUS_UPDATED",
            logName: "Job: Finished",
          },
        });
      }

      return updatedJob;
    });

    return res.status(200).json({
      success: true,
      message: "Job status updated successfully.",
      job,
    });
  } catch (error) {
    console.error("Update job status error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

/**
 * Upload a photo for a specific job.
 * Expected multipart/form-data:
 * - file: image file (camera roll/live camera/library upload all come in as a file)
 * - source: camera_roll | live_camera | library (optional)
 */
export const uploadPhotoToJob = async (
  req: Request<{ jobId: string }, {}, UploadJobPhotoBody>,
  res: Response
) => {
  try {
    const companyId = req.business?.id;
    const userId = req.user?.id;
    const { jobId } = req.params;

    if (!companyId || !userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication and company context are required.",
      });
    }

    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: "jobId is required.",
      });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "An image file is required in field 'file'.",
      });
    }

    const job = await prisma.job.findFirst({
      where: { id: jobId, companyId },
      select: { id: true },
    });
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    const uploadResult = await uploadBufferToCloudinary(
      file.buffer,
      `companies/${companyId}/jobs/${jobId}`
    );

    const source = normalizePhotoSource(req.body?.source);

    const photo = await prisma.jobPhoto.create({
      data: {
        jobId,
        companyId,
        uploadedBy: userId,
        publicId: uploadResult.public_id,
        url: uploadResult.url,
        secureUrl: uploadResult.secure_url,
        format: uploadResult.format ?? null,
        bytes: uploadResult.bytes ?? null,
        width: uploadResult.width ?? null,
        height: uploadResult.height ?? null,
        source,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Job photo uploaded successfully.",
      photo,
    });
  } catch (error) {
    console.error("Upload job photo error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

/** List all photos for a specific job within the current company. */
export const listJobPhotos = async (
  req: Request<{ jobId: string }>,
  res: Response
) => {
  try {
    const companyId = req.business?.id;
    const { jobId } = req.params;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company context is required.",
      });
    }

    const job = await prisma.job.findFirst({
      where: { id: jobId, companyId },
      select: { id: true },
    });
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    const photos = await prisma.jobPhoto.findMany({
      where: { jobId, companyId },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ success: true, photos });
  } catch (error) {
    console.error("List job photos error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

/** Delete a photo from a job and remove it from Cloudinary. */
export const deleteJobPhoto = async (
  req: Request<{ jobId: string; photoId: string }>,
  res: Response
) => {
  try {
    const companyId = req.business?.id;
    const { jobId, photoId } = req.params;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company context is required.",
      });
    }

    const photo = await prisma.jobPhoto.findFirst({
      where: { id: photoId, jobId, companyId },
    });
    if (!photo) {
      return res.status(404).json({
        success: false,
        message: "Photo not found for this job.",
      });
    }

    await cloudinary.uploader.destroy(photo.publicId, {
      resource_type: "image",
    });

    await prisma.jobPhoto.delete({ where: { id: photo.id } });

    return res.status(200).json({
      success: true,
      message: "Job photo deleted successfully.",
    });
  } catch (error) {
    console.error("Delete job photo error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};
