import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";

/** Query params for listing availabilities by employee. */
interface ListAvailabilityQuery {
  employeeId?: string;
}

/** Query params for listing technicians available for a date/time window. */
interface AvailableForWindowQuery {
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  q?: string;
}

/** Request body for creating an availability slot. */
interface CreateAvailabilityBody {
  employeeId: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTimeMinutes: number;
  endTimeMinutes: number;
  effectiveFrom?: string | null; // ISO date string
  effectiveTo?: string | null;   // ISO date string
}

/** Request body for updating an availability slot. */
interface UpdateAvailabilityBody {
  id: string;
  dayOfWeek?: number;
  startTimeMinutes?: number;
  endTimeMinutes?: number;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

/** Request body for deleting an availability slot. */
interface DeleteAvailabilityBody {
  id: string;
}

const MINUTES_PER_DAY = 24 * 60;

function isValidDayOfWeek(d: number): boolean {
  return Number.isInteger(d) && d >= 0 && d <= 6;
}

function isValidTimeMinutes(m: number): boolean {
  return Number.isInteger(m) && m >= 0 && m < MINUTES_PER_DAY;
}

function sanitizeUserForAvailability<T extends { passwordHash?: string }>(user: T): Omit<T, "passwordHash"> {
  const { passwordHash: _p, ...rest } = user;
  return rest as Omit<T, "passwordHash">;
}

/** Parse "HH:mm" to minutes from midnight (0-1439). Returns -1 if invalid. */
function parseTimeToMinutes(timeStr: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeStr);
  if (!match || match[1] == null || match[2] == null) return -1;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return -1;
  return hours * 60 + minutes;
}

/** Check if a technician's availability slots cover the job window for every day in the range. */
function technicianCoversWindow(
  slots: Array<{
    dayOfWeek: number;
    startTimeMinutes: number;
    endTimeMinutes: number;
    effectiveFrom: Date | null;
    effectiveTo: Date | null;
  }>,
  jobStartMinutes: number,
  jobEndMinutes: number,
  dateStrings: string[]
): boolean {
  if (jobEndMinutes <= jobStartMinutes) return false;
  for (const dateStr of dateStrings) {
    const d = new Date(dateStr + "T12:00:00");
    if (isNaN(d.getTime())) return false;
    const dayOfWeek = d.getDay();
    const dayStart = new Date(dateStr + "T00:00:00").getTime();
    const dayEnd = new Date(dateStr + "T23:59:59.999").getTime();
    const hasMatchingSlot = slots.some((slot) => {
      if (slot.dayOfWeek !== dayOfWeek) return false;
      if (slot.endTimeMinutes <= slot.startTimeMinutes) return false;
      if (slot.effectiveFrom != null && new Date(slot.effectiveFrom).getTime() > dayStart) return false;
      if (slot.effectiveTo != null && new Date(slot.effectiveTo).getTime() < dayEnd) return false;
      return slot.startTimeMinutes <= jobStartMinutes && slot.endTimeMinutes >= jobEndMinutes;
    });
    if (!hasMatchingSlot) return false;
  }
  return true;
}

/**
 * List technician availability for an employee.
 * Query: employeeId (required). Employee must belong to the current company.
 */
export const listByEmployee = async (
  req: Request<{}, {}, {}, ListAvailabilityQuery>,
  res: Response
) => {
  try {
    const { employeeId } = req.query;
    const companyId = req.business?.id;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "Company context required",
      });
    }

    if (!employeeId || typeof employeeId !== "string") {
      return res.status(400).json({
        success: false,
        message: "employeeId is required",
      });
    }

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const availabilities = await prisma.technicianAvailability.findMany({
      where: { employeeId },
      orderBy: [{ dayOfWeek: "asc" }, { startTimeMinutes: "asc" }],
    });

    return res.status(200).json({
      success: true,
      message: "Availabilities retrieved successfully",
      availabilities,
    });
  } catch (error) {
    console.error("List technician availability error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

/**
 * List technicians who have availability that matches the given start/end date and time window.
 * GET /api/availability/available-for-window?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&startTime=HH:mm&endTime=HH:mm&q=optionalSearch
 * Returns employees (same shape as company employees) that are technicians and whose schedule covers the window.
 */
export const listAvailableTechniciansForWindow = async (
  req: Request<{}, {}, {}, AvailableForWindowQuery>,
  res: Response
) => {
  try {
    const companyId = req.business?.id;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "Company context required",
      });
    }

    const { startDate, endDate, startTime, endTime, q } = req.query;
    if (!startDate || typeof startDate !== "string" || !endDate || typeof endDate !== "string") {
      return res.status(400).json({
        success: false,
        message: "startDate and endDate are required (YYYY-MM-DD)",
      });
    }
    if (!startTime || typeof startTime !== "string" || !endTime || typeof endTime !== "string") {
      return res.status(400).json({
        success: false,
        message: "startTime and endTime are required (HH:mm)",
      });
    }

    const jobStartMinutes = parseTimeToMinutes(startTime);
    const jobEndMinutes = parseTimeToMinutes(endTime);
    if (jobStartMinutes < 0 || jobEndMinutes < 0) {
      return res.status(400).json({
        success: false,
        message: "startTime and endTime must be valid (HH:mm)",
      });
    }
    if (jobEndMinutes <= jobStartMinutes) {
      return res.status(400).json({
        success: false,
        message: "endTime must be after startTime",
      });
    }

    const start = new Date(startDate + "T12:00:00");
    const end = new Date(endDate + "T12:00:00");
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return res.status(400).json({
        success: false,
        message: "startDate and endDate must be valid and endDate >= startDate",
      });
    }

    const dateStrings: string[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      dateStrings.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }

    const searchTerm = typeof q === "string" ? q.trim() : "";
    const hasSearch = searchTerm.length > 0;

    const technicians = await prisma.employee.findMany({
      where: {
        companyId,
        roleSlug: "technician",
        ...(hasSearch && {
          user: {
            OR: [
              { firstName: { contains: searchTerm, mode: "insensitive" } },
              { lastName: { contains: searchTerm, mode: "insensitive" } },
              { phoneNumber: { contains: searchTerm, mode: "insensitive" } },
            ],
          },
        }),
      },
      include: {
        user: true,
        technicianAvailabilities: true,
      },
    });

    const slotsByEmployee = technicians.map((emp) => ({
      employee: emp,
      slots: emp.technicianAvailabilities.map((a) => ({
        dayOfWeek: a.dayOfWeek,
        startTimeMinutes: a.startTimeMinutes,
        endTimeMinutes: a.endTimeMinutes,
        effectiveFrom: a.effectiveFrom,
        effectiveTo: a.effectiveTo,
      })),
    }));

    const available = slotsByEmployee
      .filter(({ slots }) =>
        technicianCoversWindow(
          slots,
          jobStartMinutes,
          jobEndMinutes,
          dateStrings
        )
      )
      .map(({ employee }) => employee);

    const result = available.map((e) => {
      const { technicianAvailabilities: _t, ...emp } = e;
      return { ...emp, user: sanitizeUserForAvailability(e.user) };
    });

    return res.status(200).json({
      success: true,
      message: "Available technicians retrieved successfully",
      employees: result,
    });
  } catch (error) {
    console.error("List available technicians for window error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

/**
 * Create a technician availability slot.
 * Employee must belong to the current company.
 */
export const createAvailability = async (
  req: Request<{}, {}, CreateAvailabilityBody>,
  res: Response
) => {
  try {
    const companyId = req.business?.id;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "Company context required",
      });
    }

    const {
      employeeId,
      dayOfWeek,
      startTimeMinutes,
      endTimeMinutes,
      effectiveFrom,
      effectiveTo,
    } = req.body;

    if (!employeeId || typeof employeeId !== "string") {
      return res.status(400).json({
        success: false,
        message: "employeeId is required",
      });
    }

    if (!isValidDayOfWeek(dayOfWeek)) {
      return res.status(400).json({
        success: false,
        message: "dayOfWeek must be an integer 0 (Sunday) through 6 (Saturday)",
      });
    }

    if (!isValidTimeMinutes(startTimeMinutes)) {
      return res.status(400).json({
        success: false,
        message: "startTimeMinutes must be 0–1439",
      });
    }

    if (!isValidTimeMinutes(endTimeMinutes)) {
      return res.status(400).json({
        success: false,
        message: "endTimeMinutes must be 0–1439",
      });
    }

    if (endTimeMinutes <= startTimeMinutes) {
      return res.status(400).json({
        success: false,
        message: "endTimeMinutes must be greater than startTimeMinutes",
      });
    }

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const effectiveFromDate =
      effectiveFrom != null && effectiveFrom !== ""
        ? new Date(effectiveFrom)
        : undefined;
    const effectiveToDate =
      effectiveTo != null && effectiveTo !== ""
        ? new Date(effectiveTo)
        : undefined;

    if (effectiveFromDate !== undefined && isNaN(effectiveFromDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "effectiveFrom must be a valid ISO date string",
      });
    }
    if (effectiveToDate !== undefined && isNaN(effectiveToDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "effectiveTo must be a valid ISO date string",
      });
    }

    const availability = await prisma.technicianAvailability.create({
      data: {
        employeeId,
        dayOfWeek,
        startTimeMinutes,
        endTimeMinutes,
        ...(effectiveFromDate !== undefined && { effectiveFrom: effectiveFromDate }),
        ...(effectiveToDate !== undefined && { effectiveTo: effectiveToDate }),
      },
      include: { employee: true },
    });

    return res.status(201).json({
      success: true,
      message: "Availability created successfully",
      availability,
    });
  } catch (error) {
    console.error("Create technician availability error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

/**
 * Update a technician availability slot.
 * Slot must belong to an employee in the current company.
 */
export const updateAvailability = async (
  req: Request<{}, {}, UpdateAvailabilityBody>,
  res: Response
) => {
  try {
    const companyId = req.business?.id;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "Company context required",
      });
    }

    const { id, dayOfWeek, startTimeMinutes, endTimeMinutes, effectiveFrom, effectiveTo } =
      req.body;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        success: false,
        message: "id is required",
      });
    }

    const existing = await prisma.technicianAvailability.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Availability not found",
      });
    }

    if (existing.employee.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: "Availability does not belong to this company",
      });
    }

    if (dayOfWeek !== undefined && !isValidDayOfWeek(dayOfWeek)) {
      return res.status(400).json({
        success: false,
        message: "dayOfWeek must be 0–6",
      });
    }
    if (startTimeMinutes !== undefined && !isValidTimeMinutes(startTimeMinutes)) {
      return res.status(400).json({
        success: false,
        message: "startTimeMinutes must be 0–1439",
      });
    }
    if (endTimeMinutes !== undefined && !isValidTimeMinutes(endTimeMinutes)) {
      return res.status(400).json({
        success: false,
        message: "endTimeMinutes must be 0–1439",
      });
    }

    const start = startTimeMinutes ?? existing.startTimeMinutes;
    const end = endTimeMinutes ?? existing.endTimeMinutes;
    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: "endTimeMinutes must be greater than startTimeMinutes",
      });
    }

    const effectiveFromDate =
      effectiveFrom !== undefined
        ? effectiveFrom == null || effectiveFrom === ""
          ? null
          : new Date(effectiveFrom)
        : undefined;
    const effectiveToDate =
      effectiveTo !== undefined
        ? effectiveTo == null || effectiveTo === ""
          ? null
          : new Date(effectiveTo)
        : undefined;

    if (
      effectiveFromDate !== undefined &&
      effectiveFromDate !== null &&
      isNaN(effectiveFromDate.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "effectiveFrom must be a valid ISO date string",
      });
    }
    if (
      effectiveToDate !== undefined &&
      effectiveToDate !== null &&
      isNaN(effectiveToDate.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "effectiveTo must be a valid ISO date string",
      });
    }

    const data: {
      dayOfWeek?: number;
      startTimeMinutes?: number;
      endTimeMinutes?: number;
      effectiveFrom?: Date | null;
      effectiveTo?: Date | null;
    } = {};
    if (dayOfWeek !== undefined) data.dayOfWeek = dayOfWeek;
    if (startTimeMinutes !== undefined) data.startTimeMinutes = startTimeMinutes;
    if (endTimeMinutes !== undefined) data.endTimeMinutes = endTimeMinutes;
    if (effectiveFrom !== undefined) data.effectiveFrom = effectiveFromDate ?? null;
    if (effectiveTo !== undefined) data.effectiveTo = effectiveToDate ?? null;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    const availability = await prisma.technicianAvailability.update({
      where: { id },
      data,
      include: { employee: true },
    });

    return res.status(200).json({
      success: true,
      message: "Availability updated successfully",
      availability,
    });
  } catch (error) {
    console.error("Update technician availability error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

/**
 * Delete a technician availability slot.
 * Body: id. Slot must belong to an employee in the current company.
 */
export const deleteAvailability = async (
  req: Request<{}, {}, DeleteAvailabilityBody>,
  res: Response
) => {
  try {
    const companyId = req.business?.id;
    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: "Company context required",
      });
    }

    const { id } = req.body;

    if (!id || typeof id !== "string") {
      return res.status(400).json({
        success: false,
        message: "id is required",
      });
    }

    const existing = await prisma.technicianAvailability.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Availability not found",
      });
    }

    if (existing.employee.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: "Availability does not belong to this company",
      });
    }

    await prisma.technicianAvailability.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Availability deleted successfully",
    });
  } catch (error) {
    console.error("Delete technician availability error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};
