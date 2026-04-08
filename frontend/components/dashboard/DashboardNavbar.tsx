"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LuChevronLeft,
  LuEllipsisVertical,
  LuPanelLeftOpen,
  LuPlus,
} from "react-icons/lu";
import {
  resolveMobileNavbarLeft,
  resolveMobileNavbarRight,
} from "./dashboardNavbarConfig";

const backButtonClass =
  "flex items-center justify-center -ml-1 p-1 rounded-md text-neutral-200 hover:bg-white/10";

const iconButtonClass =
  "flex items-center justify-center -mr-1 p-1 rounded-md text-neutral-200 hover:bg-white/10";

export default function DashboardNavbar() {
  const pathname = usePathname();
  const left = resolveMobileNavbarLeft(pathname);
  const right = resolveMobileNavbarRight(pathname);

  return (
    <nav className="bg-primary h-16 shrink-0 px-6 top-0 sticky border-b border-neutral-400 sm:hidden">
      <div className="flex items-center justify-between h-full">
        <div className="min-w-7 flex items-center justify-start">
          {left.kind === "back" ? (
            <Link
              href={left.href}
              aria-label={left.ariaLabel}
              className={backButtonClass}
            >
              <LuChevronLeft className="size-7" />
            </Link>
          ) : (
            <LuPanelLeftOpen className="text-neutral-200 size-7" />
          )}
        </div>
        <div>
          <h1 className="text-neutral-50 text-h6 font-bold">Duct Daddy</h1>
        </div>
        <div className="min-w-7 flex items-center justify-end">
          {right.kind === "newJob" ? (
            <Link
              href={right.href}
              aria-label={right.ariaLabel}
              className={iconButtonClass}
            >
              <LuPlus className="size-7" />
            </Link>
          ) : (
            <LuEllipsisVertical className="text-neutral-200 size-7" />
          )}
        </div>
      </div>
    </nav>
  );
}
