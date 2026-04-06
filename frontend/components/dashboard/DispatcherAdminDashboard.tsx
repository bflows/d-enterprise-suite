"use client";

import Link from "next/link";
import type { AuthenticatedUser } from "@/types/auth";

export default function DispatcherAdminDashboard({
  user,
  showEmployeesLink,
}: {
  user: AuthenticatedUser;
  /** Only admins can open the employees page; dispatchers use the other shortcuts. */
  showEmployeesLink: boolean;
}) {
  return (
    <div>
      <h1 className="text-neutral-900 text-h4 font-bold">Operations dashboard</h1>
      <p className="mt-1 text-neutral-600">
        Welcome back{user.firstName ? `, ${user.firstName}` : ""}.
      </p>
      <p className="mt-4 text-p text-neutral-700 max-w-2xl">
        Coordinate jobs, customers, services, and your team from one place. Start with the
        schedule or jump to a section below.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/schedule"
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-small font-semibold text-white hover:opacity-90"
        >
          Schedule
        </Link>
        <Link
          href="/customers"
          className="inline-flex items-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-small font-semibold text-neutral-800 hover:bg-neutral-50"
        >
          Customers
        </Link>
        <Link
          href="/services"
          className="inline-flex items-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-small font-semibold text-neutral-800 hover:bg-neutral-50"
        >
          Services
        </Link>
        {showEmployeesLink ? (
          <Link
            href="/employees"
            className="inline-flex items-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-small font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            Employees
          </Link>
        ) : null}
      </div>
    </div>
  );
}
