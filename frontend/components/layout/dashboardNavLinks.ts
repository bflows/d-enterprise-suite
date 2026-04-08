import {
  LuBookCheck,
  LuBookUser,
  LuCalendarDays,
  LuHouse,
  LuUsers,
} from "react-icons/lu";

export const DASHBOARD_NAV_SECTIONS = [
  {
    section: "Home",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LuHouse },
      { href: "/schedule", label: "Schedule", icon: LuCalendarDays },
    ],
  },
  {
    section: "Company",
    items: [
      { href: "/customers", label: "Customers", icon: LuBookUser },
      { href: "/services", label: "Services", icon: LuBookCheck },
      { href: "/employees", label: "Employees", icon: LuUsers },
    ],
  },
] as const;

export function isDashboardNavLinkActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/dashboard")
    return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  return pathname.startsWith(href + "/") || pathname === href;
}
