import { prisma } from "../lib/prisma";
import { isTwilioMessagingConfigured } from "../lib/twilio";
import type { JobConfirmationEmailPayload } from "./jobConfirmationEmail";
import { sendJob24hReminderCustomerSms } from "./jobScheduledSms";

/** Send reminder when startTime is between 23h and 24h from now (1h window). */
const REMINDER_LEAD_MS = 24 * 60 * 60 * 1000;
const REMINDER_WINDOW_MS = 60 * 60 * 1000;

const jobReminderInclude = {
  company: { select: { name: true } },
  customer: true,
  technician: { include: { user: true } },
  services: true,
} as const;

type JobForReminder = Awaited<
  ReturnType<typeof prisma.job.findMany<{ include: typeof jobReminderInclude }>>
>[number];

function toJobConfirmationPayload(job: JobForReminder): JobConfirmationEmailPayload {
  return {
    id: job.id,
    company: job.company,
    customer: {
      id: job.customer.id,
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
}

export type Job24hReminderRunResult = {
  eligible: number;
  sent: number;
  skipped: number;
  failed: number;
};

/**
 * Finds scheduled jobs whose start time falls in the 23–24 hour reminder window,
 * claims each row atomically via `reminder24hSentAt`, sends Twilio SMS, and rolls
 * back the claim if delivery fails.
 */
export async function processJob24hReminders(): Promise<Job24hReminderRunResult> {
  const result: Job24hReminderRunResult = {
    eligible: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  if (!isTwilioMessagingConfigured()) {
    return result;
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() + REMINDER_LEAD_MS - REMINDER_WINDOW_MS);
  const windowEnd = new Date(now.getTime() + REMINDER_LEAD_MS);

  const jobs = await prisma.job.findMany({
    where: {
      status: "SCHEDULED",
      reminder24hSentAt: null,
      startTime: {
        gte: windowStart,
        lt: windowEnd,
      },
    },
    include: jobReminderInclude,
    orderBy: { startTime: "asc" },
  });

  result.eligible = jobs.length;

  for (const job of jobs) {
    const claimedAt = new Date();
    const claim = await prisma.job.updateMany({
      where: { id: job.id, reminder24hSentAt: null },
      data: { reminder24hSentAt: claimedAt },
    });

    if (claim.count === 0) {
      result.skipped += 1;
      continue;
    }

    try {
      await sendJob24hReminderCustomerSms(toJobConfirmationPayload(job));
      result.sent += 1;
    } catch (err) {
      await prisma.job.update({
        where: { id: job.id },
        data: { reminder24hSentAt: null },
      });
      result.failed += 1;
      console.error("Job 24h reminder SMS failed:", { jobId: job.id, err });
    }
  }

  return result;
}
