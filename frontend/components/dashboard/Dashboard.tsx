"use client";

import { useEffect, useState } from "react";
import type { AuthenticatedUser } from "@/types/auth";
import TechnicianTimeSummaryRow from "./TechnicianTimeSummaryRow";
import TechnicianJobs from "./TechnicianJobs";

export default function TechnicianDashboard({ user }: { user: AuthenticatedUser }) {
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
          <p className="py-1 px-3 rounded-full text-small bg-neutral-300 text-neutral-600 capitalize">
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
      <TechnicianJobs user={user} />
    </div>
  );
}
