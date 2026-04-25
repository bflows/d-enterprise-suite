"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const KEY_CURRENT = "des:dashboardPathCurrent";
const KEY_PREV = "des:dashboardPathPrev";

/** Keeps sessionStorage in sync with the dashboard pathname stack (mount once in the shell). */
export function DashboardNavigationTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const current = sessionStorage.getItem(KEY_CURRENT);
    if (current == null) {
      sessionStorage.removeItem(KEY_PREV);
    } else if (current !== pathname) {
      sessionStorage.setItem(KEY_PREV, current);
    }
    sessionStorage.setItem(KEY_CURRENT, pathname);
  }, [pathname]);

  return null;
}

/** Path visited immediately before the current dashboard page (same tab). */
export function getDashboardPreviousPathname(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(KEY_PREV);
}
