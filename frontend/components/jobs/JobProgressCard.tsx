import { HiCheckCircle, HiPaperAirplane, HiPlayCircle, HiPresentationChartLine } from "react-icons/hi2";
import type { Job, JobStatus } from "@/lib/calendar/types";
import type { ApiJobStatus } from "@/lib/api/jobs";

function progressStatusLabel(status: JobStatus): string {
  const labels: Record<JobStatus, string> = {
    scheduled: "Scheduled",
    en_route: "En route",
    in_progress: "On site",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[status] ?? status;
}

type Props = {
  job: Job;
  isTechnician: boolean;
  technicianClockedIn: boolean;
  progressLoading: boolean;
  progressError: string | null;
  onProgressStatus: (apiStatus: ApiJobStatus) => void;
};

export default function JobProgressCard({
  job,
  isTechnician,
  technicianClockedIn,
  progressLoading,
  progressError,
  onProgressStatus,
}: Props) {
  const terminalProgress = job.status === "completed" || job.status === "cancelled";
  const enrouteEnabled =
    isTechnician &&
    technicianClockedIn &&
    job.status === "scheduled" &&
    !terminalProgress &&
    !progressLoading;
  const startEnabled =
    isTechnician && job.status === "en_route" && !terminalProgress && !progressLoading;
  const finishEnabled =
    isTechnician && job.status === "in_progress" && !terminalProgress && !progressLoading;

  const progressBtnClass = (enabled: boolean) =>
    `inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-p font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
      enabled
        ? "cursor-pointer bg-primary text-neutral-200 hover:bg-primary/90 focus:ring-primary"
        : "cursor-not-allowed bg-neutral-200 text-neutral-500 focus:ring-neutral-300"
    }`;

  return (
    <div className="rounded-lg p-4 border border-neutral-300 bg-neutral-50">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-neutral-900">
          <HiPresentationChartLine className="size-6 shrink-0 text-primary" aria-hidden />
          <h2 className="text-p font-semibold">Progress</h2>
        </div>
        <p className="text-p font-medium text-neutral-800">{progressStatusLabel(job.status)}</p>
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
          onClick={() => onProgressStatus("EN_ROUTE")}
        >
          <HiPaperAirplane className="size-5 shrink-0" aria-hidden />
          {progressLoading && job.status === "scheduled" ? "Updating…" : "Enroute"}
        </button>

        <button
          type="button"
          disabled={!startEnabled}
          className={progressBtnClass(startEnabled)}
          onClick={() => onProgressStatus("ON_SITE")}
        >
          <HiPlayCircle className="size-5 shrink-0" aria-hidden />
          {progressLoading && job.status === "en_route" ? "Updating…" : "Start Job"}
        </button>

        <button
          type="button"
          disabled={!finishEnabled}
          className={progressBtnClass(finishEnabled)}
          onClick={() => onProgressStatus("COMPLETED")}
        >
          <HiCheckCircle className="size-5 shrink-0" aria-hidden />
          {progressLoading && job.status === "in_progress" ? "Updating…" : "Finish Job"}
        </button>
      </div>

      {isTechnician && job.status === "scheduled" && !technicianClockedIn && (
        <p className="mt-2 text-small text-neutral-600">You must be clocked in to Enroute.</p>
      )}
    </div>
  );
}

