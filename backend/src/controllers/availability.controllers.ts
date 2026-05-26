import type { Request, Response } from "express";
import { isSchedulableRoleSlug, ROLE_SLUGS } from "../constants/roles";
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

function parseYmd(ymd: string): { y: number; m0: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const m0 = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (m0 < 0 || m0 > 11 || d < 1 || d > 31) return null;
  const check = new Date(y, m0, d);
  if (check.getFullYear() !== y || check.getMonth() !== m0 || check.getDate() !== d) {
    return null;
  }
  return { y, m0, d };
}

function formatYmdLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Inclusive local calendar dates from startYmd through endYmd (YYYY-MM-DD). */
function enumerateLocalDates(startYmd: string, endYmd: string): string[] {
  const start = parseYmd(startYmd);
  const end = parseYmd(endYmd);
  if (!start || !end) return startYmd ? [startYmd] : [];
  const cursor = new Date(start.y, start.m0, start.d);
  const endDate = new Date(end.y, end.m0, end.d);
  const dates: string[] = [];
  while (cursor <= endDate) {
    dates.push(formatYmdLocal(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function slotAppliesOnDate(
  slot: { effectiveFrom: Date | null; effectiveTo: Date | null },
  dateStr: string
): boolean {
  if (slot.effectiveFrom != null) {
    const fromYmd = formatYmdLocal(new Date(slot.effectiveFrom));
    if (fromYmd > dateStr) return false;
  }
  if (slot.effectiveTo != null) {
    const toYmd = formatYmdLocal(new Date(slot.effectiveTo));
    if (toYmd < dateStr) return false;
  }
  return true;
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
    const hasMatchingSlot = slots.some((slot) => {
      if (slot.dayOfWeek !== dayOfWeek) return false;
      if (slot.endTimeMinutes <= slot.startTimeMinutes) return false;
      if (!slotAppliesOnDate(slot, dateStr)) return false;
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
 * Returns schedulable employees (technician + admin) with coversWindow when weekly availability matches the window.
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

    const dateStrings = enumerateLocalDates(startDate, endDate);
    if (dateStrings.length === 0) {
      return res.status(400).json({
        success: false,
        message: "startDate and endDate must be valid and endDate >= startDate",
      });
    }

    const searchTerm = typeof q === "string" ? q.trim() : "";
    const hasSearch = searchTerm.length > 0;

    const technicians = await prisma.employee.findMany({
      where: {
        companyId,
        OR: [
          { roleSlug: ROLE_SLUGS.TECHNICIAN },
          { roleSlug: ROLE_SLUGS.ADMIN },
        ],
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

    const result = technicians.map((e) => {
      const slots = e.technicianAvailabilities.map((a) => ({
        dayOfWeek: a.dayOfWeek,
        startTimeMinutes: a.startTimeMinutes,
        endTimeMinutes: a.endTimeMinutes,
        effectiveFrom: a.effectiveFrom,
        effectiveTo: a.effectiveTo,
      }));
      const coversWindow =
        isSchedulableRoleSlug(e.roleSlug) &&
        technicianCoversWindow(
          slots,
          jobStartMinutes,
          jobEndMinutes,
          dateStrings
        );
      const { technicianAvailabilities: _t, ...emp } = e;
      return {
        ...emp,
        user: sanitizeUserForAvailability(e.user),
        coversWindow,
      };
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
