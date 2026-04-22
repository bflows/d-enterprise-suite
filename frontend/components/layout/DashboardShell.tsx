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
import { TIME_CARD_CLOCK_ROLE_SLUGS } from "@/types/auth";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import MobileNav from "./MobileNav";
import { MobileNavMenuProvider } from "./MobileNavMenu";
import { JobNavbarActionsProvider } from "./JobNavbarActionsContext";

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
    const role = user?.role;
    if (
      currentCompany &&
      role &&
      (TIME_CARD_CLOCK_ROLE_SLUGS as readonly string[]).includes(role)
    ) {
      void dispatch(fetchActiveTimeCard());
    } else {
      dispatch(clearTimeCardState());
    }
  }, [dispatch, user?.role, currentCompany]);

  return (
    <RequireAuth>
      <MobileNavMenuProvider>
        <JobNavbarActionsProvider>
          <div className="bg-neutral-100 flex flex-col sm:flex-row h-screen overflow-hidden">
            <Navbar />
            <Sidebar />
            <main className="flex-1 min-h-0 overflow-y-auto">
              <div className="max-w-7xl min-h-full mx-auto px-6 py-6 scroll-pt-6">
                {children}
              </div>
            </main>
            <MobileNav />
          </div>
        </JobNavbarActionsProvider>
      </MobileNavMenuProvider>
    </RequireAuth>
  );
}
