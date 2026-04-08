"use client";

import { useEffect, useState } from "react";
import type { AuthenticatedUser } from "@/types/auth";
import TechnicianTimeSummaryRow from "./TechnicianTimeSummaryRow";

export default function TechnicianDashboard({ user }: { user: AuthenticatedUser }) {
  const [todayLine, setTodayLine] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setTodayLine(
        new Intl.DateTimeFormat("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        }).format(new Date())
      );
    });
  }, []);

  return (
    <div>
      <div>
        <div className="flex items-start justify-between gap-x-2">
          <h1 className="text-h6 font-bold text-neutral-900 md:text-h3">
            Welcome, {user.firstName}!
          </h1>
          <p className="py-1 px-3 rounded-full text-small bg-neutral-300 text-neutral-600 capitalize">
            {user.role}
          </p>
        </div>
        <p className="mt-2">Today is {todayLine ?? "—"}</p>
      </div>
      <TechnicianTimeSummaryRow user={user} />
    </div>
  );
}
