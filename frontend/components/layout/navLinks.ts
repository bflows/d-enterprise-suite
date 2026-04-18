import type { IconType } from "react-icons";
import {
  HiCalendarDays,
  HiClipboardDocumentCheck,
  HiHome,
  HiIdentification,
  HiUsers,
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentCheck,
  HiOutlineHome,
  HiOutlineIdentification,
  HiOutlineUsers,
} from "react-icons/hi2";
import { ROLE_SLUGS, type RoleSlug } from "@/types/auth";

export type DashboardNavItem = {
  href: string;
  label: string;
  iconSolid: IconType;
  iconOutline: IconType;
  /**
   * If set (non-empty), only users whose current company role slug matches one of these
   * values see this link in the sidebar and mobile nav. Omit or leave empty for all roles.
   */
  requiredRoles?: readonly RoleSlug[];
};

export type DashboardNavSection = {
  section: string;
  items: readonly DashboardNavItem[];
};

/** Shared with Sidebar and mobile menu so visibility rules stay identical. */
export function userCanSeeDashboardNavItem(
  userRole: string | undefined,
  item: DashboardNavItem
): boolean {
  const required = item.requiredRoles;
  if (!required?.length) return true;
  if (!userRole) return false;
  return (required as readonly string[]).includes(userRole);
}

/** Drops items the user cannot see; removes sections that end up with no items. */
export function filterDashboardNavSections(
  sections: readonly DashboardNavSection[],
  userRole: string | undefined
): DashboardNavSection[] {
  return sections
    .map((s) => ({
      section: s.section,
      items: s.items.filter((item) => userCanSeeDashboardNavItem(userRole, item)),
    }))
    .filter((s) => s.items.length > 0);
}

export const DASHBOARD_NAV_SECTIONS: readonly DashboardNavSection[] = [
    {
      section: "Home",
      items: [
        {
          href: "/dashboard",
          label: "Dashboard",
          iconSolid: HiHome,
          iconOutline: HiOutlineHome,
        },
        {
          href: "/schedule",
          label: "Schedule",
          iconSolid: HiCalendarDays,
          iconOutline: HiOutlineCalendarDays,
        },
      ],
    },
    {
      section: "Company",
      items: [
        {
          href: "/customers",
          label: "Customers",
          iconSolid: HiIdentification,
          iconOutline: HiOutlineIdentification,
        },
        {
          href: "/services",
          label: "Services",
          iconSolid: HiClipboardDocumentCheck,
          iconOutline: HiOutlineClipboardDocumentCheck,
        },
        {
          href: "/employees",
          label: "Employees",
          iconSolid: HiUsers,
          iconOutline: HiOutlineUsers,
          requiredRoles: [ROLE_SLUGS.ADMIN]
        },
      ],
    },
  ];

export function isDashboardNavLinkActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/dashboard")
    return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  return pathname.startsWith(href + "/") || pathname === href;
}
