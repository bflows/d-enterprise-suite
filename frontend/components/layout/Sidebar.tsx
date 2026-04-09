"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { HiArrowRightOnRectangle } from "react-icons/hi2";
import type { AppDispatch } from "@/app/store";
import { logout, selectUser } from "@/features/auth/authSlice";
import {
  DASHBOARD_NAV_SECTIONS,
  isDashboardNavLinkActive,
} from "./navLinks";

const linkBaseClasses =
  "flex items-center gap-x-2 px-4 py-2 rounded-lg w-fit group transition-colors duration-300 ease-in-out hover:bg-primary/10";
const linkActiveClasses = "bg-primary/10 text-primary";
const linkInactiveClasses = "text-neutral-600";
const iconBaseClasses = "size-6 transition-colors duration-300 ease-in-out group-hover:text-primary";
const iconActiveClasses = "text-primary";

function formatRoleLabel(role: string | undefined): string {
  if (!role) return "—";
  return role
    .split(/[\s_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function userInitials(firstName: string, lastName: string): string {
  const a = firstName.trim().charAt(0);
  const b = lastName.trim().charAt(0);
  if (a && b) return `${a}${b}`.toUpperCase();
  if (a) return a.toUpperCase();
  if (b) return b.toUpperCase();
  return "?";
}

export default function DashboardSidebar() {
  const pathname = usePathname();
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const user = useSelector(selectUser);

  const displayName = user
    ? `${user.firstName}`.trim() || user.email
    : "";
  const roleLabel = formatRoleLabel(user?.role);

  const handleSignOut = () => {
    void dispatch(logout())
      .unwrap()
      .then(() => {
        router.replace("/login");
      })
      .catch(() => {
        /* keep session; user can retry */
      });
  };

  return (
    <aside className="hidden h-full bg-neutral-50 border-r border-neutral-400 sm:block sm:w-28 md:w-64 shrink-0">
      {/* Container */}
      <div className="h-full py-6 px-8 flex flex-col items-center md:items-start">
        {/* Header */}
        <div>
          <h1 className="text-neutral-900 text-h6 font-bold hidden md:block">
            Duct Daddy
          </h1>
        </div>

        {/* Links */}
        <div className="mt-8 flex-1 overflow-y-auto flex flex-col gap-y-2 md:gap-y-4">
          {DASHBOARD_NAV_SECTIONS.map(({ section, items }) => (
            <div key={section}>
              <h2 className="text-neutral-400 text-small uppercase font-bold hidden md:block">
                {section}
              </h2>
              <ul className="mt-1 flex flex-col gap-y-1">
                {items.map(({ href, label, iconSolid, iconOutline }) => {
                  const active = isDashboardNavLinkActive(pathname ?? "", href);
                  const Icon = active ? iconSolid : iconOutline;
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        className={`${linkBaseClasses} ${active ? linkActiveClasses : linkInactiveClasses}`}
                      >
                        <div>
                          <Icon
                            className={`${iconBaseClasses} ${active ? iconActiveClasses : ""}`}
                          />
                        </div>
                        <span
                          className={`hidden md:block text-p font-bold transition-colors duration-300 ease-in-out group-hover:text-primary ${active ? "text-primary" : ""}`}
                        >
                          {label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-auto sticky bottom-0 w-full border-t border-neutral-300 pt-4">
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-small font-bold"
                  aria-hidden
                >
                  {userInitials(user.firstName, user.lastName)}
                </div>
                <div className="min-w-0 flex-1 hidden md:block">
                  <p className="truncate text-p font-bold text-neutral-900">
                    {displayName}
                  </p>
                  <p className="truncate text-small text-neutral-600">
                    {roleLabel}
                  </p>
                </div>
              </>
            ) : (
              <div className="min-w-0 flex-1 hidden md:block">
                <p className="text-p text-neutral-600">Loading…</p>
              </div>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              className="hidden shrink-0 items-center justify-center rounded-md p-1 md:-mr-1 cursor-pointer text-neutral-700 md:flex hover:bg-primary/10 hover:text-primary"
            >
              <HiArrowRightOnRectangle className="size-8" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
