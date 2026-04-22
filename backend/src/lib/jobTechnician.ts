import type { Prisma } from "../../generated/prisma/client";

/** Default Prisma include for job list/detail APIs. */
export const jobApiInclude = {
  customer: true,
  technician: { include: { user: true } },
  services: true,
  invoice: true,
} satisfies Prisma.JobInclude;

export const jobApiIncludeWithCompany = {
  company: { select: { name: true } },
  ...jobApiInclude,
} satisfies Prisma.JobInclude;
