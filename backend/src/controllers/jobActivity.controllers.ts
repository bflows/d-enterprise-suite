import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";

interface ListJobActivitiesBody {
  companyId: string;
  jobId: string;
}

/**
 * List activity log rows for a job. Body must include companyId and jobId (no path params).
 * companyId must match the authenticated company context; job must belong to that company.
 */
export const listJobActivities = async (
  req: Request<{}, {}, ListJobActivitiesBody>,
  res: Response
) => {
  try {
    const { companyId, jobId } = req.body;
    if (!companyId?.trim() || !jobId?.trim()) {
      return res.status(400).json({
        success: false,
        message: "companyId and jobId are required.",
      });
    }

    const ctxCompanyId = req.business?.id;
    if (!ctxCompanyId) {
      return res.status(400).json({
        success: false,
        message: "Company context is required.",
      });
    }

    if (companyId !== ctxCompanyId) {
      return res.status(403).json({
        success: false,
        message: "companyId must match the signed-in company.",
      });
    }

    const job = await prisma.job.findFirst({
      where: { id: jobId, companyId: ctxCompanyId },
      select: { id: true },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    const activities = await prisma.jobActivity.findMany({
      where: { jobId, companyId: ctxCompanyId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ activities });
  } catch (error) {
    console.error("List job activities error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};
