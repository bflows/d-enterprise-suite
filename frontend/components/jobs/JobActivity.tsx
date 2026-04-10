import { useEffect, useMemo, useState } from "react";
import type { IconType } from "react-icons";
import {
  HiChartBar,
  HiCalendar,
  HiCheckCircle,
  HiClipboardDocumentList,
  HiClock,
  HiCurrencyDollar,
  HiMapPin,
  HiPencilSquare,
  HiPhoto,
  HiTruck,
  HiXCircle,
} from "react-icons/hi2";
import {
  listJobActivities,
  type JobActivityRow,
  type JobActivityType,
} from "@/lib/api/jobActivity";
import ActivityCard from "./ActivityCard";

interface JobActivityProps {
  companyId?: string;
  jobId: string;
  refreshSignal?: number;
}

const ACTIVITY_ICON_MAP: Record<JobActivityType, IconType> = {
  JOB_CREATED: HiClipboardDocumentList,
  JOB_UPDATED: HiPencilSquare,
  JOB_STATUS_UPDATED: HiCheckCircle,
  JOB_NOTE_UPDATED: HiPencilSquare,
  JOB_ATTACHMENT_ADDED: HiPhoto,
};

const STATUS_ICON_MAP: Record<string, IconType> = {
  SCHEDULED: HiCalendar,
  EN_ROUTE: HiTruck,
  ON_SITE: HiMapPin,
  COMPLETED: HiCheckCircle,
  INVOICED: HiCurrencyDollar,
  PAID: HiCurrencyDollar,
  CANCELLED: HiXCircle,
};

function normalizeJobStatus(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return normalized || null;
}

function getJobStatusFromActivity(activity: JobActivityRow): string | null {
  const explicitStatus = normalizeJobStatus(activity.status);
  if (explicitStatus) {
    return explicitStatus;
  }

  // Fallback for existing logs that only include prose text in logName.
  const raw = activity.logName.trim().toLowerCase();
  if (!raw) return null;
  if (raw.includes("on my way")) return "EN_ROUTE";
  if (raw.includes("on site")) return "ON_SITE";
  if (raw.includes("finished") || raw.includes("complete")) return "COMPLETED";
  if (raw.includes("cancel")) return "CANCELLED";
  if (raw.includes("paid")) return "PAID";
  if (raw.includes("invoice")) return "INVOICED";
  if (raw.includes("schedule")) return "SCHEDULED";
  return null;
}

function getActivityIcon(activity: JobActivityRow): IconType {
  if (activity.type === "JOB_STATUS_UPDATED") {
    const status = getJobStatusFromActivity(activity);
    if (status && STATUS_ICON_MAP[status]) {
      return STATUS_ICON_MAP[status];
    }
    return HiClock;
  }
  return ACTIVITY_ICON_MAP[activity.type] ?? HiCalendar;
}

function formatActor(activity: JobActivityRow): string {
  const firstName = activity.user?.firstName?.trim();
  const lastName = activity.user?.lastName?.trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  return fullName || activity.user?.email || "System";
}

export default function JobActivity({ companyId, jobId, refreshSignal = 0 }: JobActivityProps) {
  const [activities, setActivities] = useState<JobActivityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);

      listJobActivities(companyId, jobId)
        .then((rows) => {
          if (!cancelled) {
            setActivities(rows);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setActivities([]);
            setError("Failed to load activity.");
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    });

    return () => {
      cancelled = true;
    };
  }, [companyId, jobId, refreshSignal]);

  const sortedActivities = useMemo(
    () =>
      [...activities].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [activities]
  );
  const visibleActivities = companyId ? sortedActivities : [];
  const visibleLoading = companyId ? loading : false;
  const visibleError = companyId ? error : null;

  return (
    <div className="mt-4 p-4 rounded-lg border bg-neutral-50 border-neutral-300">
      <div className="flex items-center gap-x-2">
        <div>
          <HiChartBar className="size-6 shrink-0 text-neutral-900" aria-hidden />
        </div>
        <h2 className="text-h6 font-bold text-neutral-900 md:text-h5">Activity</h2>
      </div>

      <div className="mt-6 flex flex-col gap-y-4">
        {visibleLoading && <p className="text-p text-neutral-700">Loading activity...</p>}
        {!visibleLoading && visibleError && <p className="text-p text-secondary">{visibleError}</p>}
        {!visibleLoading && !visibleError && visibleActivities.length === 0 && (
          <p className="text-p text-neutral-700">No activity yet.</p>
        )}
        {!visibleLoading &&
          !visibleError &&
          visibleActivities.map((activity) => {
            const createdAt = new Date(activity.createdAt);
            return (
              <ActivityCard
                key={activity.id}
                title={activity.logName}
                actor={formatActor(activity)}
                icon={getActivityIcon(activity)}
                time={createdAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                date={createdAt.toLocaleDateString([], {
                  weekday: "long",
                  month: "numeric",
                  day: "numeric",
                  year: "numeric",
                })}
              />
            );
          })}
      </div>
    </div>
  );
}