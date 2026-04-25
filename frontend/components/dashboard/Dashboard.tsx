"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { AuthenticatedUser } from "@/types/auth";
import { selectIsClockedIn } from "@/features/timeCard/timeCardSlice";
import TechnicianTimeSummaryRow from "./TechnicianTimeSummaryRow";
import TechnicianJobs from "./TechnicianJobs";

export default function TechnicianDashboard({
  user,
  jobsListRefreshKey = 0,
}: {
  user: AuthenticatedUser;
  /** When this increments, the Jobs section refetches from the server. */
  jobsListRefreshKey?: number;
}) {
  const clockedIn = useSelector(selectIsClockedIn);
  const [dayName, setDayName] = useState<string | null>(null);
  const [calendarDate, setCalendarDate] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const now = new Date();
      setDayName(
        new Intl.DateTimeFormat("en-US", {
          weekday: "long",
        }).format(now)
      );
      setCalendarDate(
        new Intl.DateTimeFormat("en-US", {
          month: "long",
          day: "numeric",
        }).format(now)
      );
    });
  }, []);

  return (
    <div>
      <div>
        <div className="flex items-start justify-between gap-x-2">
          <h1 className="text-h5 font-bold text-neutral-900 md:text-h3">
            Welcome, {user.firstName}!
          </h1>
          <p
            className={`py-1 px-3 rounded-full text-small capitalize transition-colors duration-300 ease-in-out ${clockedIn
              ? "bg-primary text-neutral-50"
              : "bg-neutral-200 text-neutral-600"
              }`}
          >
            {user.role}
          </p>
        </div>
        <p>
          Today is {" "}
          <span className="font-bold">
            {dayName ?? "—"}
          </span>
          {calendarDate ? `, ${calendarDate}` : ""}.
        </p>
      </div>
      <TechnicianTimeSummaryRow user={user} />
      <TechnicianJobs user={user} jobsListRefreshKey={jobsListRefreshKey} />
    </div>
  );
}
