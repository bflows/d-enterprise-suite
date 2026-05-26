"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "react-icons";
import {
  HiHome,
  HiInbox,
  HiCalendarDays,
  HiOutlineCalendarDays,
  HiOutlineHome,
  HiOutlineInbox,
  HiOutlineUsers,
  HiUsers,
} from "react-icons/hi2";
import { isDashboardNavLinkActive } from "./navLinks";

type NavItem = {
  href: string;
  label: string;
  Outline: IconType;
  Solid: IconType;
};

const MOBILE_TAB_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", Outline: HiOutlineHome, Solid: HiHome },
  { href: "/schedule", label: "Schedule", Outline: HiOutlineCalendarDays, Solid: HiCalendarDays },
  { href: "/customers", label: "Customers", Outline: HiOutlineUsers, Solid: HiUsers },
  { href: "/inbox", label: "Inbox", Outline: HiOutlineInbox, Solid: HiInbox },
];

export default function DashboardMobileNav() {
  const pathname = usePathname() ?? "";

  return (
    <div className="bg-neutral-50 shrink-0 px-6 border-t border-neutral-400 pb-[env(safe-area-inset-bottom,0px)] sm:hidden">
      <div className="flex items-center justify-evenly h-20">
        {MOBILE_TAB_ITEMS.map(({ href, label, Outline, Solid }) => {
          const active = isDashboardNavLinkActive(pathname, href);
          const Icon = active ? Solid : Outline;
          return (
            <Link
              key={href}
              href={href}
              className="h-full"
              aria-label={label}
              aria-current={active ? "page" : undefined}
            >
              <div className="h-full flex items-center px-4">
                <Icon
                  className={`size-8 transition-colors duration-200 ${active ? "text-primary" : "text-neutral-600"}`}
                  aria-hidden
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
