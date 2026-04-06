"use client";

import Link from "next/link";
import type { AuthenticatedUser } from "@/types/auth";

export default function TechnicianDashboard({ user }: { user: AuthenticatedUser }) {
  return (
    <div>
      <h1 className="text-neutral-900 text-h4 font-bold">Technician dashboard</h1>
      <p className="mt-1 text-neutral-600">
        Welcome back{user.firstName ? `, ${user.firstName}` : ""}.
      </p>
      <p className="mt-4 text-p text-neutral-700 max-w-2xl">
        View and manage your assigned jobs from the schedule. Customer and service details are
        available on each job.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/schedule"
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-small font-semibold text-white hover:opacity-90"
        >
          Go to schedule
        </Link>
        <Link
          href="/customers"
          className="inline-flex items-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-small font-semibold text-neutral-800 hover:bg-neutral-50"
        >
          Customers
        </Link>
      </div>
    </div>
  );
}
