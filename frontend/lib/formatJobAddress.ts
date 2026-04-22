import type { Job } from "@/lib/calendar/types";

/** Job + API customer address fields; null allowed where the API returns it. */
export type JobAddressFields = {
  [K in "address" | "address2" | "city" | "zipCode"]?: Job[K] | null;
};

/** Single-line postal address from job / customer fields for maps APIs. */
export function formatJobAddress(source: JobAddressFields): string | null {
  const parts = [source.address, source.address2, source.city, source.zipCode]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join(", ");
}
