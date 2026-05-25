import cron from "node-cron";
import { processJob24hReminders } from "./job24hReminder";

const DEFAULT_CRON = "*/15 * * * *";

let reminderRunInProgress = false;

async function runJob24hReminders(): Promise<void> {
  if (reminderRunInProgress) {
    return;
  }
  reminderRunInProgress = true;
  try {
    const result = await processJob24hReminders();
    if (result.eligible > 0 || result.failed > 0) {
      console.log("Job 24h reminder cron:", result);
    }
  } catch (err) {
    console.error("Job 24h reminder cron error:", err);
  } finally {
    reminderRunInProgress = false;
  }
}

/**
 * Polls for jobs due a 24h SMS reminder. Disable with JOB_24H_REMINDER_CRON=0.
 * Override schedule with JOB_24H_REMINDER_CRON_SCHEDULE (default: every 15 minutes).
 */
export function startJob24hReminderCron(): void {
  if (process.env.JOB_24H_REMINDER_CRON?.trim() === "0") {
    console.log("Job 24h reminder cron disabled (JOB_24H_REMINDER_CRON=0).");
    return;
  }

  const schedule = process.env.JOB_24H_REMINDER_CRON_SCHEDULE?.trim() || DEFAULT_CRON;
  if (!cron.validate(schedule)) {
    console.error("Job 24h reminder cron: invalid JOB_24H_REMINDER_CRON_SCHEDULE:", schedule);
    return;
  }

  cron.schedule(schedule, () => {
    void runJob24hReminders();
  });

  console.log("Job 24h reminder cron scheduled:", schedule);
}
