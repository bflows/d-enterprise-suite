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

export type DashboardNavItem = {
  href: string;
  label: string;
  iconSolid: IconType;
  iconOutline: IconType;
};

export const DASHBOARD_NAV_SECTIONS: readonly {
  section: string;
  items: readonly DashboardNavItem[];
}[] = [
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
