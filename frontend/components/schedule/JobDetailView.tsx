"use client";

import type { Job } from "@/lib/calendar/types";

export interface JobDetailViewProps {
  job: Job;
}

/** Read-only job details (shared by JobDetailModal and the job detail page). */
export default function JobDetailView({ job }: JobDetailViewProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-small text-neutral-500">Title</p>
        <p className="text-p font-semibold text-neutral-900">
          {job.title?.trim() || job.customerName || "—"}
        </p>
      </div>
      <div className="flex gap-4 flex-wrap">
        <div>
          <p className="text-small text-neutral-500">Date</p>
          <p className="text-p text-neutral-900">{job.date}</p>
        </div>
        <div>
          <p className="text-small text-neutral-500">Time</p>
          <p className="text-p text-neutral-900">
            {job.startTime}
            {job.endTime ? ` – ${job.endTime}` : ""}
          </p>
        </div>
        <div>
          <p className="text-small text-neutral-500">Status</p>
          <p className="text-p capitalize text-neutral-900">
            {job.status.replace("_", " ")}
          </p>
        </div>
        {(job.technicianName != null && job.technicianName !== "") || job.technicianId ? (
          <div>
            <p className="text-small text-neutral-500">Technician</p>
            <p className="text-p text-neutral-900">{job.technicianName ?? "—"}</p>
          </div>
        ) : null}
      </div>
      {job.customerName && (
        <div>
          <p className="text-small text-neutral-500">Customer</p>
          <p className="text-p text-neutral-900">{job.customerName}</p>
        </div>
      )}
      {job.address && (
        <div>
          <p className="text-small text-neutral-500">Address</p>
          <p className="text-p text-neutral-900">{job.address}</p>
        </div>
      )}
      {job.notes && (
        <div>
          <p className="text-small text-neutral-500">Notes</p>
          <p className="text-p text-neutral-900 whitespace-pre-wrap">{job.notes}</p>
        </div>
      )}
      {job.services && job.services.length > 0 && (
        <div>
          <p className="text-small text-neutral-500 mb-2">Services</p>
          <div className="rounded-lg border border-neutral-300 overflow-hidden">
            <table className="w-full text-left text-p border-collapse">
              <thead>
                <tr className="bg-neutral-100 border-b border-neutral-300">
                  <th className="py-2 px-3 font-semibold text-neutral-700">Service</th>
                  <th className="py-2 px-3 font-semibold text-neutral-700">Quantity</th>
                  <th className="py-2 px-3 font-semibold text-neutral-700 text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {job.services.map((s) => (
                  <tr key={s.id} className="border-b border-neutral-200 last:border-b-0">
                    <td className="py-2 px-3 text-neutral-900">
                      {s.name ?? (s as { title?: string }).title ?? "—"}
                    </td>
                    <td className="py-2 px-3 text-neutral-900">
                      {s.quantity ?? (s as { unit?: number }).unit ?? "—"}
                    </td>
                    <td className="py-2 px-3 text-neutral-900 text-right">
                      ${Number(s.price ?? 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
