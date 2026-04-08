import type { Request, Response } from "express";
import type { JobStatusType } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";

/** Request body for updating a job. Only provided fields are updated. */
interface UpdateJobBody {
  id: string;
  title?: string | null;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;
  startTime?: string; // HH:mm
  endTime?: string;
  notes?: string | null;
  status?: "scheduled" | "in_progress" | "completed" | "cancelled";
  technicianId?: string;
  /** IDs of service items to attach to this job. Replaces existing services when provided. */
  serviceItemIds?: string[];
}

/** Request body for creating a job. Frontend sends date as YYYY-MM-DD and startTime/endTime as HH:mm. */
interface CreateJobBody {
  companyId: string;
  customerId: string;
  technicianId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  startTime: string; // HH:mm
  endTime: string;
  notes?: string;
  leadSource?: string;
  /** Optional initial status; defaults to SCHEDULED. */
  status?: "scheduled" | "in_progress" | "completed" | "cancelled";
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

/** Maps API/frontend snake_case statuses to Prisma `JobStatusType` (replaces legacy IN_PROGRESS with ON_SITE). */
const STATUS_MAP: Record<string, JobStatusType> = {
  scheduled: "SCHEDULED",
  in_progress: "ON_SITE",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
};

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
      startDate: startDateStr,
      endDate: endDateStr,
      startTime: startTimeStr,
      endTime: endTimeStr,
      notes,
      leadSource,
      status: statusFromBody,
      serviceItemIds,
    } = req.body;

    if (
      !companyId ||
      !customerId ||
      !technicianId ||
      !startDateStr ||
      !endDateStr ||
      !startTimeStr ||
      !endTimeStr
    ) {
      return res.status(400).json({
        success: false,
        message:
          "companyId, customerId, technicianId, startDate, endDate, startTime, and endTime are required.",
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

    const startDate = new Date(startDateStr + "T00:00:00");
    const endDate = new Date(endDateStr + "T00:00:00");
    const startTime = toDateTime(startDateStr, startTimeStr);
    const endTime = toDateTime(endDateStr, endTimeStr);
    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "startTime and endTime must be valid (HH:mm).",
      });
    }

    const status: JobStatusType =
      statusFromBody !== undefined && STATUS_MAP[statusFromBody]
        ? STATUS_MAP[statusFromBody]
        : "SCHEDULED";

    const job = await prisma.job.create({
      data: {
        companyId,
        customerId,
        technicianId,
        title,
        notes: notes ?? null,
        leadSource: leadSource ?? null,
        status,
        startDate,
        endDate,
        startTime,
        endTime,
        ...(serviceItemIds &&
          serviceItemIds.length > 0 && {
            services: {
              connect: serviceItemIds.map((id) => ({ id })),
            },
          }),
      },
      include: {
        customer: true,
        technician: { include: { user: true } },
        services: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Job created successfully",
      job,
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
      startDate?: Date;
      endDate?: Date;
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
    if (body.startDate !== undefined) data.startDate = new Date(body.startDate + "T00:00:00");
    if (body.endDate !== undefined) data.endDate = new Date(body.endDate + "T00:00:00");
    if (body.startTime !== undefined) {
      const dateForStart = body.startDate ?? dateStr(existing.startDate);
      const parsed = toDateTime(dateForStart, body.startTime);
      if (!parsed) {
        return res.status(400).json({
          success: false,
          message: "startTime must be valid (HH:mm).",
        });
      }
      data.startTime = parsed;
    }
    if (body.endTime !== undefined) {
      const dateForEnd = body.endDate ?? dateStr(existing.endDate);
      const parsed = toDateTime(dateForEnd, body.endTime);
      if (!parsed) {
        return res.status(400).json({
          success: false,
          message: "endTime must be valid (HH:mm).",
        });
      }
      data.endTime = parsed;
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
    const job = await prisma.job.update({
      where: { id },
      data,
      include: {
        customer: true,
        technician: { include: { user: true } },
        services: true,
      },
    });
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

    const jobs = await prisma.job.findMany({
      where: { companyId },
      include: {
        customer: true,
        technician: { include: { user: true } },
        services: true,
      },
      orderBy: [{ startDate: "asc" }, { startTime: "asc" }],
    });

    return res.status(200).json({ jobs });
  } catch (error) {
    console.error("List jobs error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};
