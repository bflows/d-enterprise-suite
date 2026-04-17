import { ensureSendGridConfigured, getSendGridFrom, sgMail } from "../lib/sendgrid";

export type JobConfirmationEmailPayload = {
  id: string;
  company: { name: string };
  customer: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string;
  };
  technician: { user: { firstName: string; lastName: string } };
  services: { title: string }[];
  startDate: Date;
  endDate: Date;
  startTime: Date;
  endTime: Date;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Shared with SMS and other customer notifications. */
export function formatJobDateTime(job: JobConfirmationEmailPayload): { dateLine: string; timeLine: string } {
  const tz = process.env.APP_TIMEZONE?.trim();
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };
  const locale = "en-US";
  const dateLine = tz
    ? job.startDate.toLocaleDateString(locale, { ...options, timeZone: tz })
    : job.startDate.toLocaleDateString(locale, options);

  const start = tz
    ? job.startTime.toLocaleTimeString(locale, { ...timeOptions, timeZone: tz })
    : job.startTime.toLocaleTimeString(locale, timeOptions);
  const end = tz
    ? job.endTime.toLocaleTimeString(locale, { ...timeOptions, timeZone: tz })
    : job.endTime.toLocaleTimeString(locale, timeOptions);

  const sameCalendarDay =
    job.startDate.getFullYear() === job.endDate.getFullYear() &&
    job.startDate.getMonth() === job.endDate.getMonth() &&
    job.startDate.getDate() === job.endDate.getDate();

  const timeLine = sameCalendarDay ? `${start} – ${end}` : `${start} (start) – ${end} (end across days)`;

  return { dateLine, timeLine };
}

function buildServicesList(services: { title: string }[]): string {
  if (!services.length) {
    return "<li>Services to be confirmed with your technician</li>";
  }
  return services.map((s) => `<li>${escapeHtml(s.title)}</li>`).join("");
}

type JobScheduleEmailKind = "confirmation" | "reschedule";

function introLines(kind: JobScheduleEmailKind, companyName: string): { html: string; text: string } {
  if (kind === "confirmation") {
    return {
      html: `<p>Your appointment with <strong>${escapeHtml(companyName)}</strong> is confirmed.</p>`,
      text: `Your appointment with ${companyName} is confirmed.`,
    };
  }
  return {
    html: `<p>Your appointment with <strong>${escapeHtml(companyName)}</strong> has been rescheduled. Your updated visit details are below.</p>`,
    text: `Your appointment with ${companyName} has been rescheduled. Your updated visit details are below.`,
  };
}

function buildHtml(job: JobConfirmationEmailPayload, kind: JobScheduleEmailKind): string {
  const { dateLine, timeLine } = formatJobDateTime(job);
  const customerName = `${job.customer.firstName} ${job.customer.lastName}`.trim();
  const technicianName = `${job.technician.user.firstName} ${job.technician.user.lastName}`.trim();
  const servicesHtml = buildServicesList(job.services);
  const { html: introHtml } = introLines(kind, job.company.name);

  return `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; line-height: 1.5; color: #111;">
  <p>Hi ${escapeHtml(customerName)},</p>
  ${introHtml}
  <p><strong>When:</strong><br>${escapeHtml(dateLine)}<br>${escapeHtml(timeLine)}</p>
  <p><strong>Technician:</strong> ${escapeHtml(technicianName)}</p>
  <p><strong>Services:</strong></p>
  <ul>${servicesHtml}</ul>
  <p>If you need to make changes, please contact our office.</p>
  <p>Thank you,<br>${escapeHtml(job.company.name)}</p>
</body>
</html>`.trim();
}

function buildText(job: JobConfirmationEmailPayload, kind: JobScheduleEmailKind): string {
  const { dateLine, timeLine } = formatJobDateTime(job);
  const customerName = `${job.customer.firstName} ${job.customer.lastName}`.trim();
  const technicianName = `${job.technician.user.firstName} ${job.technician.user.lastName}`.trim();
  const servicesLines =
    job.services.length > 0
      ? job.services.map((s) => `- ${s.title}`).join("\n")
      : "- Services to be confirmed with your technician";
  const { text: introText } = introLines(kind, job.company.name);

  return [
    `Hi ${customerName},`,
    "",
    introText,
    "",
    `When: ${dateLine}`,
    timeLine,
    "",
    `Technician: ${technicianName}`,
    "",
    "Services:",
    servicesLines,
    "",
    "If you need to make changes, contact the office.",
    "",
    `Thank you,`,
    job.company.name,
  ].join("\n");
}

async function sendJobScheduleCustomerEmail(
  job: JobConfirmationEmailPayload,
  kind: JobScheduleEmailKind
): Promise<void> {
  const to = job.customer.email?.trim();
  if (!to) {
    return;
  }
  if (!ensureSendGridConfigured()) {
    console.warn("SendGrid: SENDGRID_API_KEY not set; skipping job customer email.");
    return;
  }
  const from = getSendGridFrom();
  if (!from) {
    console.warn("SendGrid: SENDGRID_FROM_EMAIL not set; skipping job customer email.");
    return;
  }

  const confirmationTemplateId = process.env.SENDGRID_JOB_CONFIRMATION_TEMPLATE_ID?.trim();
  const rescheduleTemplateId = process.env.SENDGRID_JOB_RESCHEDULE_TEMPLATE_ID?.trim();
  const templateId =
    kind === "reschedule"
      ? rescheduleTemplateId || confirmationTemplateId
      : confirmationTemplateId;

  const customerFirst = job.customer.firstName.trim();
  const { dateLine, timeLine } = formatJobDateTime(job);
  const technicianName = `${job.technician.user.firstName} ${job.technician.user.lastName}`.trim();
  const subject =
    kind === "reschedule"
      ? `Appointment rescheduled — ${job.company.name}`
      : `Appointment confirmed — ${job.company.name}`;

  const replyTo = process.env.SENDGRID_REPLY_TO_EMAIL?.trim();
  const replyToField = replyTo ? { replyTo: { email: replyTo } as const } : {};

  const category = kind === "reschedule" ? "job_reschedule" : "job_confirmation";

  if (templateId) {
    await sgMail.send({
      to,
      from,
      ...replyToField,
      subject,
      templateId,
      dynamicTemplateData: {
        companyName: job.company.name,
        customerFirstName: customerFirst,
        jobDate: dateLine,
        jobTimeWindow: timeLine,
        technicianName,
        services: job.services.map((s) => ({ title: s.title })),
        servicesText: job.services.map((s) => s.title).join(", ") || "TBD",
        jobId: job.id,
        isReschedule: kind === "reschedule",
        emailSubject: subject,
      },
      categories: [category],
    });
    return;
  }

  await sgMail.send({
    to,
    from,
    ...replyToField,
    subject,
    text: buildText(job, kind),
    html: buildHtml(job, kind),
    categories: [category],
  });
}

/**
 * Sends a job confirmation to the customer when a job is scheduled.
 * Heroku: set `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` (verified sender), and optionally
 * `SENDGRID_FROM_NAME`, `APP_TIMEZONE` (IANA, e.g. America/Chicago), `SENDGRID_JOB_CONFIRMATION_TEMPLATE_ID`.
 * For reschedules after an update, see `sendJobRescheduleReminderEmail` and optional `SENDGRID_JOB_RESCHEDULE_TEMPLATE_ID`.
 * No-ops when SendGrid/from email is missing or the customer has no email.
 */
export async function sendJobScheduledConfirmationEmail(job: JobConfirmationEmailPayload): Promise<void> {
  await sendJobScheduleCustomerEmail(job, "confirmation");
}

/**
 * Same layout and dynamic fields as the appointment confirmation email, with reschedule wording and subject.
 * Uses `SENDGRID_JOB_RESCHEDULE_TEMPLATE_ID` when set; otherwise falls back to the confirmation template or HTML body.
 */
export async function sendJobRescheduleReminderEmail(job: JobConfirmationEmailPayload): Promise<void> {
  await sendJobScheduleCustomerEmail(job, "reschedule");
}
