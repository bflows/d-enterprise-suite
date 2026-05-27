/** IANA timezone for scheduling (e.g. America/Chicago). Matches emails/SMS when set. */
export function getAppTimezone(): string | undefined {
  const tz = process.env.APP_TIMEZONE?.trim();
  return tz || undefined;
}

function getZonedParts(utcMs: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(new Date(utcMs));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  let hour = get("hour");
  if (hour === 24) hour = 0;
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour,
    minute: get("minute"),
    second: get("second"),
  };
}

/**
 * Parse calendar `YYYY-MM-DD` and wall-clock `HH:mm` into a UTC instant.
 * When `APP_TIMEZONE` is set, the time is interpreted in that zone (not server local).
 */
export function wallClockToDate(dateStr: string, timeStr: string): Date | null {
  const [y, mo, d] = dateStr.split("-").map(Number);
  if (!y || !mo || !d) return null;

  const timeParts = timeStr.trim().split(":");
  const hours = parseInt(timeParts[0] ?? "", 10);
  const minutes = parseInt(timeParts[1] ?? "", 10);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const tz = getAppTimezone();
  if (!tz) {
    const dt = new Date(dateStr + "T00:00:00");
    dt.setHours(hours, minutes, 0, 0);
    return dt;
  }

  let utc = Date.UTC(y, mo - 1, d, hours, minutes, 0);
  for (let i = 0; i < 4; i++) {
    const z = getZonedParts(utc, tz);
    const targetAsUtc = Date.UTC(y, mo - 1, d, hours, minutes, 0);
    const actualAsUtc = Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute, z.second);
    const diff = targetAsUtc - actualAsUtc;
    if (diff === 0) break;
    utc += diff;
  }
  return new Date(utc);
}

/** Midnight on a calendar day in app timezone (or server local if unset). */
export function calendarDateToDate(dateStr: string): Date {
  return wallClockToDate(dateStr, "00:00") ?? new Date(dateStr + "T00:00:00");
}

/** Format a stored instant as `YYYY-MM-DD` in app timezone. */
export function dateToDateKey(date: Date): string {
  const tz = getAppTimezone();
  if (!tz) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Format a stored instant as `HH:mm` in app timezone. */
export function dateToTimeKey(date: Date): string {
  const tz = getAppTimezone();
  if (!tz) {
    const h = date.getHours();
    const m = date.getMinutes();
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  let hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  if (hour === "24") hour = "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour.padStart(2, "0")}:${minute}`;
}
