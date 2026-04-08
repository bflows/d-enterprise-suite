"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DASHBOARD_NAV_SECTIONS,
  isDashboardNavLinkActive,
} from "./dashboardNavLinks";

const linkBaseClasses =
  "flex items-center gap-x-2 px-4 py-2 rounded-lg w-fit group transition-colors duration-300 ease-in-out hover:bg-primary/10";
const linkActiveClasses = "bg-primary/10 text-primary";
const linkInactiveClasses = "text-neutral-600";
const iconBaseClasses = "size-6 transition-colors duration-300 ease-in-out group-hover:text-primary";
const iconActiveClasses = "text-primary";

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden bg-neutral-50 border-r border-neutral-400 sm:block sm:w-28 md:w-64 shrink-0">
      {/* Container */}
      <div className="py-6 px-8 flex flex-col items-center md:items-start">
        {/* Header */}
        <div>
          <h1 className="text-neutral-900 text-h6 font-bold hidden md:block">
            Duct Daddy
          </h1>
        </div>

        {/* Links */}
        <div className="mt-8 flex flex-col gap-y-2 md:gap-y-4">
          {DASHBOARD_NAV_SECTIONS.map(({ section, items }) => (
            <div key={section}>
              <h2 className="text-neutral-400 text-small uppercase font-bold hidden md:block">
                {section}
              </h2>
              <ul className="mt-1 flex flex-col gap-y-1">
                {items.map(({ href, label, icon: Icon }) => {
                  const active = isDashboardNavLinkActive(pathname ?? "", href);
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
      </div>
    </aside>
  );
}
