"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  resolveMobileNavbarLeft,
  resolveMobileNavbarRight,
} from "./navbarConfig";
import { useMobileNavMenu } from "./MobileNavMenu";
import {
  HiBars3,
  HiChevronLeft,
  HiEllipsisVertical,
  HiPlus
} from "react-icons/hi2";

const backButtonClass =
  "flex items-center justify-center -ml-2 p-1 rounded-md cursor-pointer text-neutral-200 hover:bg-white/10";

const iconButtonClass =
  "flex items-center justify-center -mr-2 p-1 rounded-md cursor-pointer text-neutral-200 hover:bg-white/10";

export default function Navbar() {
  const pathname = usePathname();
  const { openMenu } = useMobileNavMenu();
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
              <HiChevronLeft className="size-8" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={openMenu}
              aria-label="Open navigation menu"
              className={backButtonClass}
            >
              <HiBars3 className="size-8" />
            </button>
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
              <HiPlus className="size-8" />
            </Link>
          ) : (
            <button
              className={iconButtonClass}
            >
              <HiEllipsisVertical className="size-8" />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
