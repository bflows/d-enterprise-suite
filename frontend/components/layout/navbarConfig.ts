/**
 * Mobile top bar (Navbar) — left/right slots by route.
 * Left: longest matching prefix wins (resolveMobileNavbarLeft).
 * Right: exact pathname only (resolveMobileNavbarRight) so /dashboard/foo does not get dashboard-home actions.
 */

export type MobileNavbarLeftSlot =
  | { kind: "menu" }
  | { kind: "back"; href: string; ariaLabel: string };

export type MobileNavbarRightSlot =
  | { kind: "overflow" }
  | { kind: "newJob"; href: string; ariaLabel: string };

type LeftRule = {
  /** Match this path and any subpath (e.g. /dashboard/time-cards/foo). */
  prefix: string;
  slot: MobileNavbarLeftSlot;
};

const MOBILE_NAVBAR_LEFT_RULES: LeftRule[] = [
  {
    prefix: "/dashboard/time-cards",
    slot: {
      kind: "back",
      href: "/dashboard",
      ariaLabel: "Back to dashboard",
    },
  },
  // { prefix: "/dashboard/settings", slot: { kind: "back", href: "/dashboard", ariaLabel: "..." } },
];

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Returns the left-slot config for the current path.
 * Uses the longest matching prefix so nested routes inherit the parent bar unless you add a more specific rule.
 */
export function resolveMobileNavbarLeft(pathname: string): MobileNavbarLeftSlot {
  const path = normalizePathname(pathname);

  const matches = MOBILE_NAVBAR_LEFT_RULES.filter((rule) =>
    pathMatchesPrefix(path, rule.prefix),
  );

  if (matches.length === 0) {
    return { kind: "menu" };
  }

  matches.sort((a, b) => b.prefix.length - a.prefix.length);
  return matches[0].slot;
}

/** Opens the new-job flow on the schedule page (see schedule page + search param). */
export const SCHEDULE_NEW_JOB_HREF = "/schedule?newJob=1" as const;

const MOBILE_NAVBAR_RIGHT_BY_EXACT_PATH: Record<string, MobileNavbarRightSlot> = {
  "/dashboard": {
    kind: "newJob",
    href: SCHEDULE_NEW_JOB_HREF,
    ariaLabel: "Create new job",
  },
};

export function resolveMobileNavbarRight(pathname: string): MobileNavbarRightSlot {
  const path = normalizePathname(pathname);
  return MOBILE_NAVBAR_RIGHT_BY_EXACT_PATH[path] ?? { kind: "overflow" };
}
