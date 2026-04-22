"use client";

import Link from "next/link";
import type { AuthenticatedUser } from "@/types/auth";
import TechnicianTimeSummaryRow from "./TechnicianTimeSummaryRow";

export default function EmployeeDashboard({ user }: { user: AuthenticatedUser }) {
  return (
    <div>
      <h1 className="text-neutral-900 text-h4 font-bold">Dashboard</h1>
      <p className="mt-1 text-neutral-600">
        Welcome back{user.firstName ? `, ${user.firstName}` : ""}.
      </p>
      <TechnicianTimeSummaryRow user={user} />
      <p className="mt-4 text-p text-neutral-700 max-w-2xl">
        You have team member access. Use the schedule and company areas your administrator has
        opened for you.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/schedule"
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-small font-semibold text-white hover:opacity-90"
        >
          Open schedule
        </Link>
      </div>
    </div>
  );
}
