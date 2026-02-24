"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import {
  selectIsAuthenticated,
  selectHydrationDone,
} from "@/features/auth/authSlice";

/**
 * When hydration is done and user is authenticated, redirect to dashboard (or redirect param).
 */
export default function AuthLayoutRedirect({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const hydrationDone = useSelector(selectHydrationDone);

  useEffect(() => {
    if (!hydrationDone) return;
    if (isAuthenticated) {
      const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const redirect = params?.get("redirect") ?? "/dashboard";
      router.replace(redirect);
    }
  }, [hydrationDone, isAuthenticated, router]);

  if (hydrationDone && isAuthenticated) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <div className="text-center">
          <div className="inline-block size-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
          <p className="mt-2 text-sm text-neutral-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
