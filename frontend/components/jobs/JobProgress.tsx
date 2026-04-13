"use client";

import type { JobStatus } from "@/lib/calendar/types";
import type { ApiJobStatus } from "@/lib/api/jobs";
import {
  HiCheckCircle,
  HiMapPin,
  HiPresentationChartLine,
  HiTruck,
} from "react-icons/hi2";

export interface JobProgressProps {
  status: JobStatus;
  isTechnician: boolean;
  technicianClockedIn: boolean;
  progressLoading: boolean;
  progressError: string | null;
  onUpdateStatus: (apiStatus: ApiJobStatus) => void | Promise<void>;
}

function progressStatusLabel(status: JobStatus): string {
  const labels: Record<JobStatus, string> = {
    scheduled: "Scheduled",
    en_route: "En route",
    in_progress: "On site",
    completed: "Completed",
    invoiced: "Invoiced",
    paid: "Paid",
    void: "Void",
    uncollectible: "Uncollectible",
    overdue: "Overdue",
    cancelled: "Cancelled",
  };
  return labels[status] ?? status;
}

const progressBtnClass = (enabled: boolean) =>
  `inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-p font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
    enabled
      ? "cursor-pointer bg-primary text-neutral-200 hover:bg-primary/90 focus:ring-primary"
      : "cursor-not-allowed bg-neutral-200 text-neutral-500 focus:ring-neutral-300"
  }`;

export default function JobProgress({
  status,
  isTechnician,
  technicianClockedIn,
  progressLoading,
  progressError,
  onUpdateStatus,
}: JobProgressProps) {
  const terminalProgress =
    status === "completed" ||
    status === "invoiced" ||
    status === "paid" ||
    status === "void" ||
    status === "uncollectible" ||
    status === "overdue" ||
    status === "cancelled";

  const enrouteEnabled =
    isTechnician &&
    technicianClockedIn &&
    status === "scheduled" &&
    !terminalProgress &&
    !progressLoading;
  const startEnabled =
    isTechnician &&
    status === "en_route" &&
    !terminalProgress &&
    !progressLoading;
  const finishEnabled =
    isTechnician &&
    status === "in_progress" &&
    !terminalProgress &&
    !progressLoading;

  return (
    <div className="mt-4 rounded-lg p-4 border border-neutral-300 bg-neutral-50">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-neutral-900">
          <HiPresentationChartLine className="size-6 shrink-0 text-neutral-900" aria-hidden />
          <h2 className="text-h6 font-bold">Progress</h2>
        </div>
        <p className="text-small text-neutral-600">
          {progressStatusLabel(status)}
        </p>
      </div>

      {progressError && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {progressError}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!enrouteEnabled}
          className={progressBtnClass(enrouteEnabled)}
          onClick={() => void onUpdateStatus("EN_ROUTE")}
        >
          <HiTruck className="size-5 shrink-0" aria-hidden />
          {progressLoading && status === "scheduled" ? "Updating..." : "On the way"}
        </button>

        <button
          type="button"
          disabled={!startEnabled}
          className={progressBtnClass(startEnabled)}
          onClick={() => void onUpdateStatus("ON_SITE")}
        >
          <HiMapPin className="size-5 shrink-0" aria-hidden />
          {progressLoading && status === "en_route" ? "Updating..." : "On Site"}
        </button>

        <button
          type="button"
          disabled={!finishEnabled}
          className={progressBtnClass(finishEnabled)}
          onClick={() => void onUpdateStatus("COMPLETED")}
        >
          <HiCheckCircle className="size-5 shrink-0" aria-hidden />
          {progressLoading && status === "in_progress" ? "Updating..." : "Complete Job"}
        </button>
      </div>

      {isTechnician && status === "scheduled" && !technicianClockedIn && (
        <p className="mt-2 text-small text-neutral-600">
          You must be clocked in to Enroute.
        </p>
      )}
    </div>
  );
}

