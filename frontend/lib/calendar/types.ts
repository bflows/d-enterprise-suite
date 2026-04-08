export type JobStatus =
  | "scheduled"
  | "en_route"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface Job {
  id: string;
  title?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime?: string;
  status: JobStatus;
  customerName?: string;
  customerId?: string;
  address?: string;
  notes?: string;
  technicianId?: string;
  technicianName?: string;
  /** IDs of service items (from Service Book) to attach to this job when saving. */
  serviceItemIds?: string[];
  /** Services attached to this job (populated when job is loaded from API). */
  services?: { id: string; name: string; quantity: number; price: number }[];
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
  const jobEnd = new Date(
    `${job.date}T${job.endTime ?? job.startTime}`
  ).getTime();
  const start = new Date(`${windowStartDate}T${windowStartTime}`).getTime();
  const end = new Date(`${windowEndDate}T${windowEndTime}`).getTime();
  return jobStart < end && jobEnd > start;
}
