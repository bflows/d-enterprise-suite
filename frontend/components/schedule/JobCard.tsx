"use client";

import type { Job } from "@/lib/calendar/types";
import { formatTimeLabel } from "@/lib/calendar/types";

export interface JobCardProps {
  job: Job;
  onClick: () => void;
}

const statusColors: Record<Job["status"], string> = {
  scheduled: "bg-primary/15 text-primary border-primary/30",
  en_route: "bg-sky-500/15 text-sky-900 border-sky-500/30",
  in_progress: "bg-amber-500/15 text-amber-800 border-amber-500/30",
  completed: "bg-green-500/15 text-green-800 border-green-500/30",
  invoiced: "bg-violet-500/15 text-violet-900 border-violet-500/30",
  paid: "bg-emerald-600/15 text-emerald-900 border-emerald-600/30",
  void: "bg-neutral-200 text-neutral-600 border-neutral-300",
  uncollectible: "bg-rose-500/15 text-rose-900 border-rose-500/30",
  overdue: "bg-orange-500/15 text-orange-900 border-orange-500/30",
  cancelled: "bg-neutral-200 text-neutral-500 border-neutral-300",
};

export default function JobCard({ job, onClick }: JobCardProps) {
  const statusClass = statusColors[job.status] ?? statusColors.scheduled;
  const startTimeLabel = formatTimeLabel(job.startTime);
  const endTimeLabel = job.endTime ? formatTimeLabel(job.endTime) : undefined;
  const timeLabel = job.endTime
    ? `${startTimeLabel} - ${endTimeLabel}`
    : startTimeLabel;
  const displayTitle = job.title?.trim() || job.customerName || "Untitled job";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`text-left rounded-lg px-3 py-2 w-full transition-colors cursor-pointer hover:ring-2 hover:ring-primary/50 focus:outline-none focus:ring-2 focus:ring-primary ${statusClass}`}
    >
      <span className="font-bold text-p block truncate" title={displayTitle}>
        {displayTitle}
      </span>
      <div className="flex items-center justify-between mt-2 md:justify-start gap-x-2 md:mt-0 md:flex-col md:items-start">
        <span className="text-p font-bold md:mt-2 block truncate text-neutral-600" title={timeLabel}>
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
