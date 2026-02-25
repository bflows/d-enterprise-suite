"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "@/app/store";
import RequireAuth from "@/components/auth/RequireAuth";
import { fetchEmployment } from "@/features/auth/authSlice";
import { selectIsAuthenticated } from "@/features/auth/authSlice";
// import DashboardSidebar from "./DashboardSidebar";

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
      <div className="flex flex-col sm:flex-row min-h-screen">
        {/* Navbar (mobile) */}
        <div className="top-0 sticky sm:hidden">
          Navbar
        </div>
        {/* Sidebar (desktop) */}
        <div className="hidden sm:block sm:w-48 md:w-64">
          Sidebar
        </div>
        {/* Display (both) */}
        <main className="flex-1">
          {children}
        </main>
        {/* BottomNav (mobile) */}
        <div className="bottom-0 sticky sm:hidden">
          Bottom Nav
        </div>
      </div>
    </RequireAuth>
  );
}
