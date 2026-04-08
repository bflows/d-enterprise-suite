"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "@/app/store";
import RequireAuth from "@/components/auth/RequireAuth";
import {
  fetchEmployment,
  selectIsAuthenticated,
  selectUser,
  selectCurrentCompany,
} from "@/features/auth/authSlice";
import {
  fetchActiveTimeCard,
  clearTimeCardState,
} from "@/features/timeCard/timeCardSlice";
import { ROLE_SLUGS } from "@/types/auth";
import DashboardSidebar from "./DashboardSidebar";
import DashboardNavbar from "./DashboardNavbar";
import DashboardMobileNav from "./DashboardMobileNav";
import { MobileNavMenuProvider } from "./MobileNavMenu";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const currentCompany = useSelector(selectCurrentCompany);

  useEffect(() => {
    if (isAuthenticated) {
      void dispatch(fetchEmployment());
    }
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (user?.role === ROLE_SLUGS.TECHNICIAN && currentCompany) {
      void dispatch(fetchActiveTimeCard());
    } else {
      dispatch(clearTimeCardState());
    }
  }, [dispatch, user?.role, currentCompany]);

  return (
    <RequireAuth>
      <MobileNavMenuProvider>
        <div className="bg-neutral-200 flex flex-col sm:flex-row h-screen overflow-hidden">
          <DashboardNavbar />
          <DashboardSidebar />
          <main className="flex-1 min-h-0 overflow-y-auto">
            <div className="max-w-7xl min-h-full mx-auto px-6 py-6">
              {children}
            </div>
          </main>
          <DashboardMobileNav />
        </div>
      </MobileNavMenuProvider>
    </RequireAuth>
  );
}
