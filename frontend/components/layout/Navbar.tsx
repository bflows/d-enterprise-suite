"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  resolveMobileNavbarLeft,
  resolveMobileNavbarRight,
  resolveOverflowMenuItems,
} from "./navbarConfig";
import { useMobileNavMenu } from "./MobileNavMenu";
import {
  HiBars3,
  HiChevronLeft,
  HiEllipsisVertical,
  HiPlus,
  HiArrowUpOnSquare,
  HiBanknotes,
  HiPencilSquare,
  HiTrash,
} from "react-icons/hi2";
import ActionMenu, { type ActionMenuItem } from "@/components/ui/ActionMenu";

const backButtonClass =
  "flex items-center justify-center -ml-2 p-1 rounded-md cursor-pointer text-neutral-100 hover:bg-white/10";

const iconButtonClass =
  "flex items-center justify-center -mr-2 p-1 rounded-md cursor-pointer text-neutral-100 hover:bg-white/10";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { openMenu } = useMobileNavMenu();
  const left = resolveMobileNavbarLeft(pathname);
  const right = resolveMobileNavbarRight(pathname);

  const overflowItems: ActionMenuItem[] = resolveOverflowMenuItems(pathname).map((d) => {
    const icon =
      d.icon === "sendInvoice"
        ? HiArrowUpOnSquare
        : d.icon === "requestPayment"
          ? HiBanknotes
          : d.icon === "updateJob"
            ? HiPencilSquare
            : HiTrash;

    if ("href" in d) {
      return { label: d.label, icon, href: d.href, iconClassName: "size-6" };
    }

    return {
      label: d.label,
      icon,
      iconClassName: "size-6",
      onClick: () => {
        router.push(`${pathname}?action=${encodeURIComponent(d.action)}`);
      },
    };
  });

  return (
    <nav className="bg-primary h-16 shrink-0 px-6 top-0 sticky border-b border-neutral-400 sm:hidden">
      <div className="flex items-center justify-between h-full">
        <div className="min-w-7 flex items-center justify-start">
          {left.kind === "back" ? (
            <button
              type="button"
              onClick={() => router.back()}
              aria-label={left.ariaLabel}
              className={backButtonClass}
            >
              <HiChevronLeft className="size-8" />
            </button>
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
        <div className="flex items-center justify-end">
          {right.kind === "newJob" ? (
            <Link
              href={right.href}
              aria-label={right.ariaLabel}
              className={iconButtonClass}
            >
              <HiPlus className="size-8" />
            </Link>
          ) : overflowItems.length > 0 ? (
            <ActionMenu
              align="right"
              triggerLabel="Open menu"
              items={overflowItems}
              trigger={<HiEllipsisVertical className="size-8 text-neutral-100" aria-hidden />}
            />
          ) : (
            <span className="block size-10" aria-hidden />
          )}
        </div>
      </div>
    </nav>
  );
}
