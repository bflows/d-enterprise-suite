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
import { DashboardNavigationTracker } from "./dashboardNavigationPaths";

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

  // Lock document scroll on mobile so only <main> scrolls (iOS Chrome treats 100vh as taller than the visible viewport).
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => {
      if (mq.matches) {
        document.documentElement.style.overflow = "hidden";
        document.documentElement.style.height = "100%";
        document.body.style.overflow = "hidden";
        document.body.style.height = "100%";
      } else {
        document.documentElement.style.overflow = "";
        document.documentElement.style.height = "";
        document.body.style.overflow = "";
        document.body.style.height = "";
      }
    };
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      document.documentElement.style.overflow = "";
      document.documentElement.style.height = "";
      document.body.style.overflow = "";
      document.body.style.height = "";
    };
  }, []);

  return (
    <RequireAuth>
      <DashboardNavigationTracker />
      <MobileNavMenuProvider>
        <JobNavbarActionsProvider>
          <div className="bg-neutral-100 fixed inset-0 z-0 flex flex-col overflow-hidden sm:static sm:inset-auto sm:h-dvh sm:flex-row">
            <Navbar />
            <Sidebar />
            <main className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y">
              <div className="max-w-7xl mx-auto px-6 py-6 scroll-pt-6">
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
