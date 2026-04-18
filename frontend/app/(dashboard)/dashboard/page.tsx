"use client";

import { useSelector } from "react-redux";
import { selectUser } from "@/features/auth/authSlice";
import EmployeeDashboard from "@/components/dashboard/EmployeeDashboard";
import Dashboard from "@/components/dashboard/Dashboard";
import { ROLE_SLUGS } from "@/types/auth";

export default function DashboardPage() {
  const user = useSelector(selectUser);

  if (!user) {
    return null;
  }

  if (!user.role) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <div className="text-center">
          <div className="inline-block size-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
          <p className="text-neutral-800 text-p mt-2">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  switch (user.role) {
    case ROLE_SLUGS.TECHNICIAN:
      return <Dashboard user={user} />;
    case ROLE_SLUGS.DISPATCHER:
    case ROLE_SLUGS.ADMIN:
      return <Dashboard user={user} />;
    case ROLE_SLUGS.EMPLOYEE:
      return <EmployeeDashboard user={user} />;
    default:
      return <EmployeeDashboard user={user} />;
  }
}
