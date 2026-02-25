"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "@/app/store";
import RequireAuth from "@/components/auth/RequireAuth";
import { fetchEmployment } from "@/features/auth/authSlice";
import { selectIsAuthenticated } from "@/features/auth/authSlice";
import DashboardSidebar from "./DashboardSidebar";
import DashboardNavbar from "./DashboardNavbar";
import DashboardMobileNav from "./DashboardMobileNav";

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
      <div className="bg-neutral-200 flex flex-col sm:flex-row min-h-screen">
        <DashboardNavbar />
        <DashboardSidebar />
        <main className="flex-1">
          <div className="max-w-7xl min-h-screen mx-auto px-6 py-6">
            {children}
          </div>
        </main>
        <DashboardMobileNav />
      </div>
    </RequireAuth>
  );
}
