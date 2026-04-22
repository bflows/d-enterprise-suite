/**
 * Mobile top bar (Navbar) — left/right slots by route.
 * Left: longest matching prefix wins (resolveMobileNavbarLeft).
 * Right: resolveMobileNavbarRight — ellipsis on hub routes except /dashboard (ActionMenu with Create job).
 */

export type MobileNavbarLeftSlot =
  | { kind: "menu" }
  | { kind: "back"; href: string; ariaLabel: string };

export type MobileNavbarRightSlot =
  | { kind: "overflow" }
  | { kind: "ellipsis" };

export type OverflowMenuItemDescriptor = {
  label: string;
  icon:
    | "sendInvoice"
    | "requestPayment"
    | "updateJob"
    | "removeJob"
    | "updateCustomer"
    | "removeCustomer"
    | "createJob";
} & (
  | { href: string; action?: never }
  | {
      action:
        | "sendInvoice"
        | "requestPayment"
        | "updateJob"
        | "removeJob"
        | "updateCustomer"
        | "removeCustomer"
        | "createJob";
      href?: never;
    }
);

type LeftRule = {
  /** Match this path and any subpath (e.g. /dashboard/time-cards/foo). */
  prefix: string;
  slot: MobileNavbarLeftSlot;
};

const MOBILE_NAVBAR_LEFT_RULES: LeftRule[] = [
  {
    prefix: "/job",
    slot: {
      kind: "back",
      href: "/schedule",
      ariaLabel: "Back to schedule",
    },
  },
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
/** Single-segment detail under /customers, e.g. /customers/abc (not the list at /customers). */
function isCustomerDetailPath(path: string): boolean {
  return /^\/customers\/[^/]+$/.test(path);
}

export function resolveMobileNavbarLeft(pathname: string): MobileNavbarLeftSlot {
  const path = normalizePathname(pathname);

  if (isCustomerDetailPath(path)) {
    return {
      kind: "back",
      href: "/customers",
      ariaLabel: "Back to customers",
    };
  }

  const matches = MOBILE_NAVBAR_LEFT_RULES.filter((rule) =>
    pathMatchesPrefix(path, rule.prefix),
  );

  if (matches.length === 0) {
    return { kind: "menu" };
  }

  matches.sort((a, b) => b.prefix.length - a.prefix.length);
  return matches[0].slot;
}

const ELLIPSIS_NAVBAR_RIGHT_PATHS = new Set([
  "/schedule",
  "/customers",
  "/inbox",
]);

export function resolveMobileNavbarRight(pathname: string): MobileNavbarRightSlot {
  const path = normalizePathname(pathname);
  if (ELLIPSIS_NAVBAR_RIGHT_PATHS.has(path)) {
    return { kind: "ellipsis" };
  }
  return { kind: "overflow" };
}

export function resolveOverflowMenuItems(pathname: string): OverflowMenuItemDescriptor[] {
  const path = normalizePathname(pathname);

  if (path === "/dashboard") {
    return [{ label: "Create job", icon: "createJob", action: "createJob" }];
  }

  if (isCustomerDetailPath(path)) {
    return [
      { label: "Update", icon: "updateCustomer", action: "updateCustomer" },
      { label: "Remove", icon: "removeCustomer", action: "removeCustomer" },
    ];
  }

  if (!pathMatchesPrefix(path, "/job")) return [];

  return [
    { label: "Invoice", icon: "sendInvoice", action: "sendInvoice" },
    { label: "Payment", icon: "requestPayment", action: "requestPayment" },
    { label: "Update", icon: "updateJob", action: "updateJob" },
    { label: "Remove", icon: "removeJob", action: "removeJob" },
  ];
}
