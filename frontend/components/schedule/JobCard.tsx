"use client";

import type { Job } from "@/lib/calendar/types";

export interface JobCardProps {
  job: Job;
  onClick: () => void;
}

const statusColors: Record<Job["status"], string> = {
  scheduled: "bg-primary/15 text-primary border-primary/30",
  in_progress: "bg-amber-500/15 text-amber-800 border-amber-500/30",
  completed: "bg-green-500/15 text-green-800 border-green-500/30",
  cancelled: "bg-neutral-200 text-neutral-500 border-neutral-300",
};

export default function JobCard({ job, onClick }: JobCardProps) {
  const statusClass = statusColors[job.status] ?? statusColors.scheduled;
  const timeLabel = job.endTime
    ? `${job.startTime} – ${job.endTime}`
    : job.startTime;
  const displayTitle = job.title?.trim() || job.customerName || "Untitled job";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`
        w-full text-left rounded-md border px-2 py-1.5 text-small transition-colors
        hover:ring-2 hover:ring-primary/50 focus:outline-none focus:ring-2 focus:ring-primary
        ${statusClass}
      `}
    >
      <span className="font-semibold block truncate" title={displayTitle}>
        {displayTitle}
      </span>
      <span className="text-neutral-600 block truncate" title={timeLabel}>
        {timeLabel}
      </span>
      {job.customerName && (
        <span className="text-neutral-500 block truncate" title={job.customerName}>
          {job.customerName}
        </span>
      )}
    </button>
  );
}
