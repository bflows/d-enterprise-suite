"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const KEY_CURRENT = "des:dashboardPathCurrent";
const KEY_PREV = "des:dashboardPathPrev";
const KEY_RETURN_PREV_PREFIX = "des:dashboardReturnPrev:";

function normalizePathname(p: string): string {
  if (p.length > 1 && p.endsWith("/")) return p.slice(0, -1);
  return p;
}

function returnPrevKeyFor(destination: string): string {
  return `${KEY_RETURN_PREV_PREFIX}${normalizePathname(destination)}`;
}

/** Semantic list/parent route for detail pages (used when popping back via `from`). */
export function inferDashboardParentPathname(pathname: string): string | null {
  const path = normalizePathname(pathname);
  if (/^\/customers\/[^/]+$/.test(path)) return "/customers";
  if (/^\/services\/[^/]+\/[^/]+$/.test(path)) {
    const match = path.match(/^\/services\/([^/]+)\//);
    return match ? `/services/${match[1]}` : "/services";
  }
  if (/^\/services\/[^/]+$/.test(path)) return "/services";
  if (path === "/job" || path.startsWith("/job/")) return "/schedule";
  if (path.startsWith("/timecards/")) return "/dashboard";
  return null;
}

/**
 * Before navigating back to `destination` (e.g. via `?from=`), record what `KEY_PREV`
 * should be when that page loads so the next back chevron does not return to the
 * page being left (e.g. job → customer → customers, not job again).
 */
export function scheduleDashboardReturn(destination: string): void {
  if (typeof window === "undefined") return;
  const safe = getSafeInternalReturnPath(destination);
  if (!safe) return;
  const parent = inferDashboardParentPathname(safe);
  if (parent) {
    sessionStorage.setItem(returnPrevKeyFor(safe), parent);
  }
}

/** Keeps sessionStorage in sync with the dashboard pathname stack (mount once in the shell). */
export function DashboardNavigationTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const normalized = normalizePathname(pathname);
    const returnPrev = sessionStorage.getItem(returnPrevKeyFor(normalized));
    if (returnPrev != null) {
      sessionStorage.setItem(KEY_PREV, returnPrev);
      sessionStorage.setItem(KEY_CURRENT, pathname);
      sessionStorage.removeItem(returnPrevKeyFor(normalized));
      return;
    }

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

/** Accept only same-app relative paths (blocks open redirects). */
export function getSafeInternalReturnPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  return trimmed;
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
  // Job opened from customer history should not be the back target on customer detail.
  if (/^\/customers\/[^/]+$/.test(nCurrent) && (nPrev === "/job" || nPrev.startsWith("/job/"))) {
    return inferDashboardParentPathname(nCurrent) ?? nPrev;
  }
  return nPrev;
}
