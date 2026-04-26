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

function normalizePathname(p: string): string {
  if (p.length > 1 && p.endsWith("/")) return p.slice(0, -1);
  return p;
}

/**
 * Target for the mobile navbar back chevron: the last in-app page before the
 * current route, ignoring query-only navigations. Use this instead of
 * `router.back()` so flows like "Update customer" (push+replace) do not
 * require multiple back taps.
 */
export function getPreferredMobileBackPathname(
  currentPathname: string
): string | null {
  const prev = getDashboardPreviousPathname();
  if (!prev) return null;
  const nCurrent = normalizePathname(currentPathname);
  const nPrev = normalizePathname(prev);
  if (nPrev === nCurrent) return null;
  return nPrev;
}
