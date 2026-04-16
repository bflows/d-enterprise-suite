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

function formatJobDateTime(job: JobConfirmationEmailPayload): { dateLine: string; timeLine: string } {
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

function buildHtml(job: JobConfirmationEmailPayload): string {
  const { dateLine, timeLine } = formatJobDateTime(job);
  const customerName = `${job.customer.firstName} ${job.customer.lastName}`.trim();
  const technicianName = `${job.technician.user.firstName} ${job.technician.user.lastName}`.trim();
  const servicesHtml = buildServicesList(job.services);

  return `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; line-height: 1.5; color: #111;">
  <p>Hi ${escapeHtml(customerName)},</p>
  <p>Your appointment with <strong>${escapeHtml(job.company.name)}</strong> is confirmed.</p>
  <p><strong>When:</strong><br>${escapeHtml(dateLine)}<br>${escapeHtml(timeLine)}</p>
  <p><strong>Technician:</strong> ${escapeHtml(technicianName)}</p>
  <p><strong>Services:</strong></p>
  <ul>${servicesHtml}</ul>
  <p>If you need to make changes, please contact our office.</p>
  <p>Thank you,<br>${escapeHtml(job.company.name)}</p>
</body>
</html>`.trim();
}

function buildText(job: JobConfirmationEmailPayload): string {
  const { dateLine, timeLine } = formatJobDateTime(job);
  const customerName = `${job.customer.firstName} ${job.customer.lastName}`.trim();
  const technicianName = `${job.technician.user.firstName} ${job.technician.user.lastName}`.trim();
  const servicesLines =
    job.services.length > 0
      ? job.services.map((s) => `- ${s.title}`).join("\n")
      : "- Services to be confirmed with your technician";

  return [
    `Hi ${customerName},`,
    "",
    `Your appointment with ${job.company.name} is confirmed.`,
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

/**
 * Sends a job confirmation to the customer when a job is scheduled.
 * Heroku: set `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` (verified sender), and optionally
 * `SENDGRID_FROM_NAME`, `APP_TIMEZONE` (IANA, e.g. America/Chicago), `SENDGRID_JOB_CONFIRMATION_TEMPLATE_ID`.
 * No-ops when SendGrid/from email is missing or the customer has no email.
 */
export async function sendJobScheduledConfirmationEmail(job: JobConfirmationEmailPayload): Promise<void> {
  const to = job.customer.email?.trim();
  if (!to) {
    return;
  }
  if (!ensureSendGridConfigured()) {
    console.warn("SendGrid: SENDGRID_API_KEY not set; skipping job confirmation email.");
    return;
  }
  const from = getSendGridFrom();
  if (!from) {
    console.warn("SendGrid: SENDGRID_FROM_EMAIL not set; skipping job confirmation email.");
    return;
  }

  const templateId = process.env.SENDGRID_JOB_CONFIRMATION_TEMPLATE_ID?.trim();
  const customerFirst = job.customer.firstName.trim();
  const { dateLine, timeLine } = formatJobDateTime(job);
  const technicianName = `${job.technician.user.firstName} ${job.technician.user.lastName}`.trim();
  const subject = `Appointment confirmed — ${job.company.name}`;

  const replyTo = process.env.SENDGRID_REPLY_TO_EMAIL?.trim();
  const replyToField = replyTo ? { replyTo: { email: replyTo } as const } : {};

  if (templateId) {
    await sgMail.send({
      to,
      from,
      ...replyToField,
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
      },
      categories: ["job_confirmation"],
    });
    return;
  }

  await sgMail.send({
    to,
    from,
    ...replyToField,
    subject,
    text: buildText(job),
    html: buildHtml(job),
    categories: ["job_confirmation"],
  });
}
