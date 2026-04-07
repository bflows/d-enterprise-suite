import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";

/** When the client sends user/company in the body, they must match the authenticated session. */
function validateClockBody(req: Request): string | null {
  const body = req.body as Record<string, unknown> | undefined;
  if (!body || typeof body !== "object") return null;
  const company = body.company as { id?: string } | undefined;
  const user = body.user as { id?: string } | undefined;
  if (company?.id && company.id !== req.business!.id) {
    return "Company in request does not match session.";
  }
  if (user?.id && user.id !== req.user!.id) {
    return "User in request does not match session.";
  }
  return null;
}

/**
 * Returns the open time card for this user at the current company, if any.
 */
export const getActiveTimeCard = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.business) {
      return res.status(403).json({
        success: false,
        message: "Business context required.",
      });
    }

    const active = await prisma.timeCard.findFirst({
      where: {
        userId: req.user.id,
        companyId: req.business.id,
        clockedOutAt: null,
      },
      orderBy: { clockedInAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      data: { activeTimeCard: active },
    });
  } catch (error) {
    console.error("getActiveTimeCard error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load time card status.",
    });
  }
};

/**
 * Lists time cards for the current user at the current company with clockedInAt in the last 7 days (rolling window).
 */
export const getRecentTimeCards = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.business) {
      return res.status(403).json({
        success: false,
        message: "Business context required.",
      });
    }

    const since = new Date();
    since.setDate(since.getDate() - 7);

    const timeCards = await prisma.timeCard.findMany({
      where: {
        userId: req.user.id,
        companyId: req.business.id,
        clockedInAt: { gte: since },
      },
      orderBy: { clockedInAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      data: { timeCards },
    });
  } catch (error) {
    console.error("getRecentTimeCards error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load time cards.",
    });
  }
};

/**
 * Clock in: creates a time card with clockedInAt = now. Fails if already clocked in.
 */
export const clockIn = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.business) {
      return res.status(403).json({
        success: false,
        message: "Business context required.",
      });
    }

    const bodyError = validateClockBody(req);
    if (bodyError) {
      return res.status(400).json({ success: false, message: bodyError });
    }

    const existingOpen = await prisma.timeCard.findFirst({
      where: {
        userId: req.user.id,
        companyId: req.business.id,
        clockedOutAt: null,
      },
    });

    if (existingOpen) {
      return res.status(409).json({
        success: false,
        message: "Already clocked in. Clock out before starting a new shift.",
        data: { timeCard: existingOpen },
      });
    }

    const timeCard = await prisma.timeCard.create({
      data: {
        userId: req.user.id,
        companyId: req.business.id,
        clockedInAt: new Date(),
      },
    });

    return res.status(201).json({
      success: true,
      message: "Clocked in.",
      data: { timeCard },
    });
  } catch (error) {
    console.error("clockIn error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to clock in.",
    });
  }
};

/**
 * Clock out: sets clockedOutAt on the open time card for this user at the current company.
 */
export const clockOut = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.business) {
      return res.status(403).json({
        success: false,
        message: "Business context required.",
      });
    }

    const bodyError = validateClockBody(req);
    if (bodyError) {
      return res.status(400).json({ success: false, message: bodyError });
    }

    const open = await prisma.timeCard.findFirst({
      where: {
        userId: req.user.id,
        companyId: req.business.id,
        clockedOutAt: null,
      },
      orderBy: { clockedInAt: "desc" },
    });

    if (!open) {
      return res.status(400).json({
        success: false,
        message: "No active clock-in. Clock in first.",
      });
    }

    const timeCard = await prisma.timeCard.update({
      where: { id: open.id },
      data: { clockedOutAt: new Date() },
    });

    return res.status(200).json({
      success: true,
      message: "Clocked out.",
      data: { timeCard },
    });
  } catch (error) {
    console.error("clockOut error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to clock out.",
    });
  }
};
