"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "@/app/store";
import RequireAuth from "@/components/auth/RequireAuth";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { fetchEmployment } from "@/features/auth/authSlice";
import { selectIsAuthenticated } from "@/features/auth/authSlice";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      void dispatch(fetchEmployment());
    }
  }, [dispatch, isAuthenticated]);

  return (
    <RequireAuth>
      <div className="min-h-screen bg-neutral-50">
        <DashboardHeader />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </div>
    </RequireAuth>
  );
}
