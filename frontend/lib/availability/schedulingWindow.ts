/**
 * Weekly availability vs. job window (mirrors backend availability.controllers logic).
 */

export interface AvailabilitySlotLike {
  dayOfWeek: number;
  startTimeMinutes: number;
  endTimeMinutes: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
}

export function parseTimeToMinutes(timeStr: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeStr.trim());
  if (!match) return -1;
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

export function enumerateLocalDates(startYmd: string, endYmd: string): string[] {
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

function slotAppliesOnDate(slot: AvailabilitySlotLike, dateStr: string): boolean {
  if (slot.effectiveFrom) {
    const fromYmd = formatYmdLocal(new Date(slot.effectiveFrom));
    if (fromYmd > dateStr) return false;
  }
  if (slot.effectiveTo) {
    const toYmd = formatYmdLocal(new Date(slot.effectiveTo));
    if (toYmd < dateStr) return false;
  }
  return true;
}

/** True when recurring slots fully cover the job window on every day in the range. */
export function technicianCoversWindow(
  slots: AvailabilitySlotLike[],
  jobStartMinutes: number,
  jobEndMinutes: number,
  dateStrings: string[]
): boolean {
  if (jobEndMinutes <= jobStartMinutes) return false;
  for (const dateStr of dateStrings) {
    const d = new Date(`${dateStr}T12:00:00`);
    if (isNaN(d.getTime())) return false;
    const dayOfWeek = d.getDay();
    const hasMatchingSlot = slots.some((slot) => {
      if (slot.dayOfWeek !== dayOfWeek) return false;
      if (slot.endTimeMinutes <= slot.startTimeMinutes) return false;
      if (!slotAppliesOnDate(slot, dateStr)) return false;
      return (
        slot.startTimeMinutes <= jobStartMinutes &&
        slot.endTimeMinutes >= jobEndMinutes
      );
    });
    if (!hasMatchingSlot) return false;
  }
  return true;
}

export function jobWindowCoversFromStrings(
  date: string,
  startTime: string,
  endTime: string
): { jobStartMinutes: number; jobEndMinutes: number; dateStrings: string[] } | null {
  const jobStartMinutes = parseTimeToMinutes(startTime);
  const jobEndMinutes = parseTimeToMinutes(endTime);
  if (jobStartMinutes < 0 || jobEndMinutes < 0 || jobEndMinutes <= jobStartMinutes) {
    return null;
  }
  const dateStrings = enumerateLocalDates(date, date);
  if (dateStrings.length === 0) return null;
  return { jobStartMinutes, jobEndMinutes, dateStrings };
}
