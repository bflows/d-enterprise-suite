"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { LuLogOut, LuPanelLeftClose } from "react-icons/lu";
import type { AppDispatch } from "@/app/store";
import { logout, selectUser } from "@/features/auth/authSlice";
import {
  DASHBOARD_NAV_SECTIONS,
  isDashboardNavLinkActive,
} from "./dashboardNavLinks";

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

type MobileNavDrawerContextValue = {
  open: boolean;
  openMenu: () => void;
  closeMenu: () => void;
};

const MobileNavDrawerContext = createContext<
  MobileNavDrawerContextValue | undefined
>(undefined);

export function useMobileNavDrawer(): MobileNavDrawerContextValue {
  const ctx = useContext(MobileNavDrawerContext);
  if (!ctx) {
    throw new Error("useMobileNavDrawer must be used within MobileNavDrawerProvider");
  }
  return ctx;
}

export function MobileNavDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const drawerContainerRef = useRef<HTMLDivElement>(null);

  const openMenu = useCallback(() => setOpen(true), []);
  const closeMenu = useCallback(() => {
    const active = document.activeElement as HTMLElement | null;
    if (active && drawerContainerRef.current?.contains(active)) {
      active.blur();
    }
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, closeMenu]);

  const value: MobileNavDrawerContextValue = { open, openMenu, closeMenu };

  return (
    <MobileNavDrawerContext.Provider value={value}>
      {children}
      <MobileNavDrawerPanel containerRef={drawerContainerRef} />
    </MobileNavDrawerContext.Provider>
  );
}

const linkBaseClasses =
  "flex items-center gap-x-3 px-4 py-3 rounded-lg w-full text-left transition-colors duration-200 hover:bg-primary/10";
const linkActiveClasses = "bg-primary/10 text-primary";
const linkInactiveClasses = "text-neutral-800";

/** Snappy but smooth drawer motion (quicker than 300ms, softer than linear ease-out). */
const drawerMotion =
  "duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-150 motion-reduce:transition-none";

function MobileNavDrawerPanel({
  containerRef,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
}) {
  const { open, closeMenu } = useMobileNavDrawer();
  const pathname = usePathname() ?? "";
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const user = useSelector(selectUser);

  const displayName = user
    ? `${user.firstName} ${user.lastName}`.trim() || user.email
    : "";
  const roleLabel = formatRoleLabel(user?.role);

  const handleSignOut = () => {
    closeMenu();
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
    <div
      ref={containerRef}
      className={`fixed inset-0 z-100 sm:hidden transition-opacity ${drawerMotion} ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 bg-black/50"
        onClick={closeMenu}
      />
      <nav
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`absolute inset-y-0 left-0 flex h-full w-full max-w-full flex-col bg-neutral-50 shadow-xl transition-transform ${drawerMotion} transform-gpu ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-400 bg-primary px-4">
          <span className="text-neutral-50 text-h6 font-bold">Duct Daddy</span>
          <button
            type="button"
            onClick={closeMenu}
            aria-label="Close navigation menu"
            className="flex items-center justify-center rounded-md p-2 text-neutral-200 hover:bg-white/10"
          >
            <LuPanelLeftClose className="size-7" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
          {DASHBOARD_NAV_SECTIONS.map(({ section, items }) => (
            <div key={section} className="mb-6 last:mb-0">
              <h2 className="text-neutral-400 text-small font-bold uppercase">
                {section}
              </h2>
              <ul className="mt-2 flex flex-col gap-y-1">
                {items.map(({ href, label, icon: Icon }) => {
                  const active = isDashboardNavLinkActive(pathname, href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={closeMenu}
                        className={`${linkBaseClasses} ${active ? linkActiveClasses : linkInactiveClasses}`}
                      >
                        <Icon
                          className={`size-6 shrink-0 ${active ? "text-primary" : "text-neutral-600"}`}
                        />
                        <span className="text-p font-bold">{label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="shrink-0 border-t border-neutral-400 bg-neutral-50 px-4 py-3">
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div
                  className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-small font-bold"
                  aria-hidden
                >
                  {userInitials(user.firstName, user.lastName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-p font-bold text-neutral-900">
                    {displayName}
                  </p>
                  <p className="truncate text-small text-neutral-600">
                    {roleLabel}
                  </p>
                </div>
              </>
            ) : (
              <div className="min-w-0 flex-1">
                <p className="text-p text-neutral-600">Loading…</p>
              </div>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              className="flex shrink-0 items-center justify-center rounded-md p-2 text-neutral-700 hover:bg-primary/10 hover:text-primary"
            >
              <LuLogOut className="size-6" />
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
