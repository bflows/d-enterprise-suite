"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/app/store";
import { logout, selectUser, selectHasAnyRole } from "@/features/auth/authSlice";
import type { RoleSlug } from "@/types/auth";

export default function DashboardHeader() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const user = useSelector(selectUser);
  const isAdmin = useSelector((s: RootState) => selectHasAnyRole(s, ["admin"] as RoleSlug[]));

  const handleLogout = async () => {
    await dispatch(logout());
    router.replace("/login");
  };

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <nav className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-neutral-700 hover:text-neutral-900"
          >
            Dashboard
          </Link>
          {isAdmin && (
            <Link
              href="/dashboard/admin"
              className="text-sm font-medium text-neutral-700 hover:text-neutral-900"
            >
              Admin
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-600">
            {user?.firstName} {user?.lastName}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
