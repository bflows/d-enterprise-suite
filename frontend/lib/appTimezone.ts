/** IANA timezone for schedule display; must match backend `APP_TIMEZONE`. */
export function getAppTimezone(): string | undefined {
  const tz = process.env.NEXT_PUBLIC_APP_TIMEZONE?.trim();
  return tz || undefined;
}

/** Format an API ISO datetime as `YYYY-MM-DD` in app timezone. */
export function dateToDateKey(iso: string): string {
  const date = new Date(iso);
  const tz = getAppTimezone();
  if (!tz) {
    return iso.slice(0, 10);
  }
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Format an API ISO datetime as `HH:mm` in app timezone. */
export function dateToTimeKey(iso: string): string {
  const date = new Date(iso);
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
