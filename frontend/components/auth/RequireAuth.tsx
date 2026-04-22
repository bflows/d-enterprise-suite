"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import {
  selectIsAuthenticated,
  selectHydrationDone,
  selectAuthLoading,
} from "@/features/auth/authSlice";

const LOGIN_PATH = "/login";

/**
 * Wraps children and only renders them when the user is authenticated.
 * Shows loading until hydration is done, then redirects to login if not authenticated.
 */
export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const hydrationDone = useSelector(selectHydrationDone);
  const isLoading = useSelector(selectAuthLoading);

  useEffect(() => {
    if (!hydrationDone || isLoading) return;
    if (!isAuthenticated) {
      const redirect = `${LOGIN_PATH}?redirect=${encodeURIComponent(pathname ?? "/dashboard")}`;
      router.replace(redirect);
    }
  }, [hydrationDone, isLoading, isAuthenticated, router, pathname]);

  if (!hydrationDone || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-100">
        <div className="text-center">
          <div className="inline-block size-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
          <p className="text-p font-bold mt-2 text-neutral-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
