"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import {
  selectIsAuthenticated,
  selectHydrationDone,
  selectAuthLoading,
  selectHasAnyRole,
} from "@/features/auth/authSlice";
import type { RoleSlug } from "@/types/auth";

const UNAUTHORIZED_PATH = "/dashboard";
const LOGIN_PATH = "/login";

/**
 * Wraps children and only renders them when the user is authenticated AND has one of the allowed roles.
 * Redirects to login if not authenticated, or to dashboard if authenticated but wrong role.
 */
export default function RequireRole({
  allowedRoles,
  children,
}: {
  allowedRoles: RoleSlug[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const hydrationDone = useSelector(selectHydrationDone);
  const isLoading = useSelector(selectAuthLoading);
  const hasRole = useSelector((state: RootState) =>
    selectHasAnyRole(state, allowedRoles)
  );

  useEffect(() => {
    if (!hydrationDone || isLoading) return;
    if (!isAuthenticated) {
      const redirect = `${LOGIN_PATH}?redirect=${encodeURIComponent(pathname ?? "/dashboard")}`;
      router.replace(redirect);
      return;
    }
    if (!hasRole) {
      router.replace(UNAUTHORIZED_PATH);
    }
  }, [hydrationDone, isLoading, isAuthenticated, hasRole, router, pathname]);

  if (!hydrationDone || isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <div className="text-center">
          <div className="inline-block size-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
          <p className="mt-2 text-sm text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !hasRole) {
    return null;
  }

  return <>{children}</>;
}
