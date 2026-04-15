"use client";

import type { Job } from "@/lib/calendar/types";
import { formatInvoiceStatus, formatTimeLabel } from "@/lib/calendar/types";

export interface JobCardProps {
  job: Job;
  onClick: () => void;
}

const statusColors: Record<Job["status"], string> = {
  scheduled: "bg-primary/15 text-primary border-primary/30",
  en_route: "bg-sky-500/15 text-sky-900 border-sky-500/30",
  in_progress: "bg-amber-500/15 text-amber-800 border-amber-500/30",
  completed: "bg-green-500/15 text-green-800 border-green-500/30",
  cancelled: "bg-neutral-200 text-neutral-500 border-neutral-300",
};

const invoiceAccentClass = (job: Job): string => {
  const s = job.invoice?.status;
  if (!s) return "";
  if (s === "paid") return " ring-2 ring-emerald-500/40";
  if (s === "overdue") return " ring-2 ring-orange-500/40";
  if (s === "void" || s === "cancelled") return " opacity-90";
  if (s === "uncollectable") return " ring-2 ring-rose-500/30";
  if (s === "invoiced") return " ring-1 ring-violet-400/50";
  return "";
};

export default function JobCard({ job, onClick }: JobCardProps) {
  const statusClass = statusColors[job.status] ?? statusColors.scheduled;
  const accent = invoiceAccentClass(job);
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
      className={`text-left rounded-lg px-3 py-2 w-full transition-colors cursor-pointer hover:ring-2 hover:ring-primary/50 focus:outline-none focus:ring-2 focus:ring-primary border ${statusClass}${accent}`}
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
      {job.invoice ? (
        <p className="mt-2 text-small text-neutral-600 capitalize">
          Invoice: {formatInvoiceStatus(job.invoice.status)}
        </p>
      ) : null}
    </button>
  );
}
