import type { Job } from "@/lib/calendar/types";

/** Single-line postal address from job / customer fields for maps APIs. */
export function formatJobAddress(job: Job): string | null {
  const parts = [job.address, job.address2, job.city, job.zipCode]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join(", ");
}
