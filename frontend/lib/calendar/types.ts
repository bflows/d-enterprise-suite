export type JobStatus =
  | "scheduled"
  | "en_route"
  | "in_progress"
  | "completed"
  | "cancelled";

/** Mirrors backend `InvoiceStatusType` (snake_case for UI). */
export type InvoiceStatus =
  | "invoiced"
  | "paid"
  | "void"
  | "uncollectable"
  | "overdue"
  | "cancelled";

export interface JobInvoiceSummary {
  id: string;
  status: InvoiceStatus;
  stripeInvoiceId?: string | null;
}

export interface Job {
  id: string;
  title?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime?: string;
  status: JobStatus;
  customerName?: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerId?: string;
  address?: string;
  address2?: string;
  city?: string;
  zipCode?: string;
  notes?: string;
  technicianId?: string;
  technicianName?: string;
  /** IDs of service items (from Service Book) to attach to this job when saving. */
  serviceItemIds?: string[];
  /** Derived from `invoice.stripeInvoiceId` when present (Stripe `in_…`). */
  stripeInvoiceId?: string | null;
  /** Billing row for this job, when an invoice has been created. */
  invoice?: JobInvoiceSummary | null;
  /** Services attached to this job (populated when job is loaded from API). */
  services?: {
    id: string;
    name: string;
    description?: string;
    quantity: number;
    /** Per-unit price in integer USD cents (matches ServiceItem.price). */
    price: number;
    /** Minutes per unit; used with unit/quantity to derive end time. */
    duration?: number;
    /** Prisma `ServiceItem.unit` (non-negative; schedule multiplier). */
    serviceUnit?: number;
    /** Prisma `ServiceItem.quantity` (line count; schedule multiplier). */
    serviceQuantity?: number;
  }[];
}

export function formatJobStatus(status: JobStatus): string {
  const labels: Record<JobStatus, string> = {
    scheduled: "Scheduled",
    en_route: "En route",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[status] ?? status;
}

export function formatInvoiceStatus(status: InvoiceStatus): string {
  const labels: Record<InvoiceStatus, string> = {
    invoiced: "Invoiced",
    paid: "Paid",
    void: "Void",
    uncollectable: "Uncollectable",
    overdue: "Overdue",
    cancelled: "Cancelled",
  };
  return labels[status] ?? status;
}

export function isInvoiceTerminalForPayment(invoice: JobInvoiceSummary | null | undefined): boolean {
  if (!invoice) return false;
  return (
    invoice.status === "paid" ||
    invoice.status === "void" ||
    invoice.status === "uncollectable" ||
    invoice.status === "cancelled"
  );
}

export function isSameDay(dateStr: string, d: Date): boolean {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return dateStr === `${y}-${m}-${day}`;
}

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getDaysInMonth(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const startPad = first.getDay(); // 0 = Sunday
  const days: Date[] = [];
  const start = new Date(first);
  start.setDate(start.getDate() - startPad);
  for (let i = 0; i < 42; i++) {
    days.push(new Date(start));
    start.setDate(start.getDate() + 1);
  }
  return days;
}

export function getWeekDates(anchor: Date): Date[] {
  const day = anchor.getDay();
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - day);
  const week: Date[] = [];
  for (let i = 0; i < 7; i++) {
    week.push(new Date(start));
    start.setDate(start.getDate() + 1);
  }
  return week;
}

export function addWeeks(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n * 7);
  return out;
}

export function formatMonthYear(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function formatWeekRange(dates: Date[]): string {
  if (dates.length < 2) return formatMonthYear(dates[0] ?? new Date());
  const first = dates[0]!;
  const last = dates[dates.length - 1]!;
  const sameMonth = first.getMonth() === last.getMonth();
  if (sameMonth) {
    return `${first.toLocaleDateString("en-US", { month: "short" })} ${first.getDate()} – ${last.getDate()}, ${first.getFullYear()}`;
  }
  return `${first.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${last.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

/** Formats 24-hour `HH:mm` to `h:mma` (e.g. `14:00` -> `2:00pm`). */
export function formatTimeLabel(time: string): string {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return time;
  const hours = Number(match[1]);
  const minutes = match[2];
  if (!Number.isInteger(hours) || hours < 0 || hours > 23) return time;

  const period = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes}${period}`;
}

/** `HH:mm` on `dateYmd` plus `addMinutes` (local). */
export function addMinutesToHhMm(
  dateYmd: string,
  timeHhMm: string,
  addMinutes: number
): string {
  const m = timeHhMm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return timeHhMm;
  const d = new Date(`${dateYmd}T${String(m[1]).padStart(2, "0")}:${m[2]}:00`);
  d.setMinutes(d.getMinutes() + addMinutes);
  const h = d.getHours();
  const min = d.getMinutes();
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** Total scheduled minutes from line items (duration × unit × quantity per line). */
export function jobServiceDurationMinutes(job: Job): number {
  const services = job.services ?? [];
  if (services.length === 0) return 0;
  return services.reduce((sum, s) => {
    const m = s.duration ?? 0;
    const u = s.serviceUnit != null && s.serviceUnit > 0 ? s.serviceUnit : 1;
    const q = s.serviceQuantity != null && s.serviceQuantity > 0 ? s.serviceQuantity : 1;
    return sum + m * u * q;
  }, 0);
}

/** Active jobs that still occupy a technician for calendar overlap; completed/cancelled do not. */
export function jobBlocksTechnicianOverlap(job: Job): boolean {
  return job.status !== "completed" && job.status !== "cancelled";
}

/** End time (HH:mm) for overlap checks: derived from services when possible, else stored endTime. */
export function jobBlockEndHhMm(job: Job): string {
  const mins = jobServiceDurationMinutes(job);
  if (mins > 0) {
    return addMinutesToHhMm(job.date, job.startTime, mins);
  }
  return job.endTime ?? job.startTime;
}

/** Returns true if a job overlaps the given window for the given technician (if technicianId provided). */
export function jobOverlapsWindow(
  job: Job,
  windowStartDate: string,
  windowStartTime: string,
  windowEndDate: string,
  windowEndTime: string,
  technicianId?: string
): boolean {
  if (technicianId != null && job.technicianId !== technicianId) return false;
  const jobStart = new Date(`${job.date}T${job.startTime}`).getTime();
  const jobEnd = new Date(`${job.date}T${jobBlockEndHhMm(job)}`).getTime();
  const start = new Date(`${windowStartDate}T${windowStartTime}`).getTime();
  const end = new Date(`${windowEndDate}T${windowEndTime}`).getTime();
  return jobStart < end && jobEnd > start;
}
