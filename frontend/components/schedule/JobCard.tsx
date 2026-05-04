"use client";

import type { Job } from "@/lib/calendar/types";
import { formatJobStatus, formatTimeLabel } from "@/lib/calendar/types";

export interface JobCardProps {
  job: Job;
  onClick: () => void;
}

/** Status colors apply only to the status tag; the card uses neutral styling. */
const statusTagClass: Record<Job["status"], string> = {
  scheduled: "bg-neutral-100 text-neutral-600 border-neutral-200",
  en_route: "bg-primary/10 text-primary border-primary/20",
  in_progress: "bg-amber-500/15 text-amber-800 border-amber-500/30",
  completed: "bg-green-500/15 text-green-800 border-green-500/30",
  cancelled: "bg-neutral-200 text-neutral-600 border-neutral-300",
};

export default function JobCard({ job, onClick }: JobCardProps) {
  const tagClass = statusTagClass[job.status] ?? statusTagClass.scheduled;
  const startTimeLabel = formatTimeLabel(job.startTime);
  const endTimeLabel = job.endTime ? formatTimeLabel(job.endTime) : undefined;
  const timeLabel = job.endTime
    ? `${startTimeLabel} - ${endTimeLabel}`
    : startTimeLabel;
  const displayTitle = job.title?.trim() || job.customerName || "Untitled job";
  const statusLabel = formatJobStatus(job.status);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="px-3 py-2 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <span className="font-bold text-p block truncate text-neutral-800" title={displayTitle}>
          {displayTitle}
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-small ${tagClass}`}
          title={`Status: ${statusLabel}`}
        >
          {statusLabel}
        </span>
      </div>
      <div className="flex items-center justify-between mt-2 md:justify-start gap-x-2 md:mt-0 md:flex-col md:items-start">
        <span className="text-p md:mt-2 block truncate text-neutral-600" title={timeLabel}>
          {timeLabel}
        </span>
        {job.customerName && (
          <span className="text-small block truncate text-neutral-600" title={job.customerName}>
            {job.customerName}
          </span>
        )}
      </div>
    </button>
  );
}
