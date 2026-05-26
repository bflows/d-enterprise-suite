"use client";

import { usePathname, useRouter } from "next/navigation";
import { getPreferredMobileBackPathname } from "./dashboardNavigationPaths";
import {
  isServiceBookDetailPath,
  isServiceCategoryDetailPath,
  resolveMobileNavbarLeft,
  resolveMobileNavbarPrimaryAction,
  resolveOverflowMenuItems,
} from "./navbarConfig";
import { useMobileNavMenu } from "./MobileNavMenu";
import {
  HiBars3,
  HiChevronLeft,
  HiEllipsisVertical,
  HiArrowUpOnSquare,
  HiPencilSquare,
  HiTrash,
  HiCreditCard,
  HiPlus,
  HiUserPlus,
  HiBookOpen,
  HiFolderPlus,
} from "react-icons/hi2";
import ActionMenu, { type ActionMenuItem } from "@/components/ui/ActionMenu";
import { useJobNavbarActions } from "./JobNavbarActionsContext";

const backButtonClass =
  "flex items-center justify-center -ml-2 p-1 rounded-md cursor-pointer text-neutral-100 hover:bg-white/10";

function navbarTitleForPathname(pathname: string): string {
  const p =
    pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  if (p === "/dashboard" || p.startsWith("/dashboard/")) return "Dashboard";
  if (p === "/timecards" || p.startsWith("/timecards/")) return "Time Cards";
  if (p === "/schedule" || p.startsWith("/schedule/")) return "Schedule";
  if (p === "/customers") return "Customers";
  if (p.startsWith("/customers/")) return "Customer";
  if (p === "/inbox" || p.startsWith("/inbox/")) return "Inbox";
  if (p === "/job" || p.startsWith("/job/")) return "Job";
  if (p === "/services") return "Services";
  if (isServiceBookDetailPath(p)) return "Servicebook";
  if (isServiceCategoryDetailPath(p)) return "Category";
  return "Duct Daddy";
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { openMenu } = useMobileNavMenu();
  const { jobInvoiceDisabled, jobPaymentDisabled } = useJobNavbarActions();
  const left = resolveMobileNavbarLeft(pathname);
  const primaryAction = resolveMobileNavbarPrimaryAction(pathname);

  const overflowItems: ActionMenuItem[] = resolveOverflowMenuItems(pathname).map((d) => {
    const icon =
      d.icon === "createJob"
        ? HiPlus
        : d.icon === "createCustomer"
          ? HiUserPlus
          : d.icon === "createServiceBook"
            ? HiBookOpen
            : d.icon === "createCategory"
              ? HiFolderPlus
            : d.icon === "sendInvoice"
          ? HiArrowUpOnSquare
          : d.icon === "requestPayment"
            ? HiCreditCard
            : d.icon === "updateJob" || d.icon === "updateCustomer"
              ? HiPencilSquare
              : HiTrash;

    if ("href" in d) {
      return { label: d.label, icon, href: d.href, iconClassName: "size-6" };
    }

    const disabled =
      d.action === "sendInvoice" && jobInvoiceDisabled
        ? true
        : d.action === "requestPayment" && jobPaymentDisabled
          ? true
          : undefined;

    return {
      label: d.label,
      icon,
      iconClassName: "size-6",
      disabled,
      onClick: () => {
        if (d.action === "createJob") {
          router.replace(`${pathname}?newJob=1`);
        } else if (d.action === "createCustomer") {
          router.replace(`${pathname}?newCustomer=1`);
        } else if (d.action === "createServiceBook") {
          router.replace(`${pathname}?newServiceBook=1`);
        } else if (d.action === "createCategory") {
          router.replace(`${pathname}?newCategory=1`);
        } else {
          router.replace(`${pathname}?action=${encodeURIComponent(d.action)}`);
        }
      },
    };
  });

  return (
    <nav className="z-40 bg-primary shrink-0 px-6 pt-[env(safe-area-inset-top,0px)] sm:hidden">
      <div className="flex items-center justify-between h-16">
        <div className="flex items-center justify-start">
          {left.kind === "back" ? (
            <button
              type="button"
              onClick={() => {
                if (isServiceBookDetailPath(pathname)) {
                  router.push(left.href);
                  return;
                }
                const preferred = getPreferredMobileBackPathname(pathname);
                if (preferred) {
                  router.push(preferred);
                  return;
                }
                if (typeof window !== "undefined" && window.history.length > 1) {
                  router.back();
                } else {
                  router.push(left.href);
                }
              }}
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
          <h1 className="text-neutral-50 text-h6 font-bold">
            {navbarTitleForPathname(pathname)}
          </h1>
        </div>
        <div className="flex items-center justify-end">
          {primaryAction ? (
            <button
              type="button"
              aria-label={primaryAction.ariaLabel}
              className="flex items-center justify-center -mr-2 p-1 rounded-md cursor-pointer text-neutral-100 hover:bg-white/10"
              onClick={() => {
                if (primaryAction.action === "createServiceBook") {
                  router.replace(`${pathname}?newServiceBook=1`);
                } else if (primaryAction.action === "createCategory") {
                  router.replace(`${pathname}?newCategory=1`);
                } else if (primaryAction.action === "createService") {
                  router.replace(`${pathname}?newService=1`);
                }
              }}
            >
              <HiPlus className="size-8" aria-hidden />
            </button>
          ) : overflowItems.length > 0 ? (
            <ActionMenu
              align="right"
              triggerLabel="Open menu"
              items={overflowItems}
              trigger={<HiEllipsisVertical className="size-8 -mr-2 text-neutral-100" aria-hidden />}
            />
          ) : (
            <span className="block size-10" aria-hidden />
          )}
        </div>
      </div>
    </nav>
  );
}
