/**
 * Mobile top bar (Navbar) — left slot by route; right slot is ActionMenu when overflow items exist.
 * Left: longest matching prefix wins (resolveMobileNavbarLeft).
 */

export type MobileNavbarLeftSlot =
  | { kind: "menu" }
  | { kind: "back"; href: string; ariaLabel: string };

export type OverflowMenuItemDescriptor = {
  label: string;
  icon:
    | "sendInvoice"
    | "requestPayment"
    | "updateJob"
    | "removeJob"
    | "updateCustomer"
    | "removeCustomer"
    | "createJob"
    | "createCustomer"
    | "createServiceBook"
    | "createCategory"
    | "createService";
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
        | "createJob"
        | "createCustomer"
        | "createServiceBook"
        | "createCategory"
        | "createService";
      href?: never;
    }
);

export type MobileNavbarPrimaryAction = {
  icon: "createServiceBook" | "createCategory" | "createService";
  action: "createServiceBook" | "createCategory" | "createService";
  ariaLabel: string;
};

type LeftRule = {
  /** Match this path and any subpath (e.g. /timecards/foo). */
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
    prefix: "/timecards",
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

/** Service book detail: /services/{slug} (not list or category item pages). */
export function isServiceBookDetailPath(path: string): boolean {
  return /^\/services\/[^/]+$/.test(path);
}

/** Category detail: /services/{slug}/{categorySlug} */
export function isServiceCategoryDetailPath(path: string): boolean {
  return /^\/services\/[^/]+\/[^/]+$/.test(path);
}

function serviceBookHrefFromCategoryPath(path: string): string {
  const match = path.match(/^\/services\/([^/]+)\//);
  return match ? `/services/${match[1]}` : "/services";
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

  if (isServiceBookDetailPath(path)) {
    return {
      kind: "back",
      href: "/services",
      ariaLabel: "Back to services",
    };
  }

  if (isServiceCategoryDetailPath(path)) {
    return {
      kind: "back",
      href: serviceBookHrefFromCategoryPath(path),
      ariaLabel: "Back to servicebook",
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

export function resolveMobileNavbarPrimaryAction(
  pathname: string,
): MobileNavbarPrimaryAction | null {
  const path = normalizePathname(pathname);

  if (path === "/services") {
    return {
      icon: "createServiceBook",
      action: "createServiceBook",
      ariaLabel: "Create servicebook",
    };
  }

  if (isServiceBookDetailPath(path)) {
    return {
      icon: "createCategory",
      action: "createCategory",
      ariaLabel: "Create category",
    };
  }

  if (isServiceCategoryDetailPath(path)) {
    return {
      icon: "createService",
      action: "createService",
      ariaLabel: "Create service",
    };
  }

  return null;
}

const HUB_NEW_JOB_CUSTOMER_PATHS = new Set([
  "/dashboard",
  "/schedule",
  "/customers",
  "/inbox",
]);

export function resolveOverflowMenuItems(pathname: string): OverflowMenuItemDescriptor[] {
  const path = normalizePathname(pathname);

  if (HUB_NEW_JOB_CUSTOMER_PATHS.has(path)) {
    return [
      { label: "New Job", icon: "createJob", action: "createJob" },
      { label: "New Customer", icon: "createCustomer", action: "createCustomer" },
    ];
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
