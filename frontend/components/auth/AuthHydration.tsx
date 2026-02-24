"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { store } from "@/app/store";
import type { AppDispatch } from "@/app/store";
import {
  refreshSession,
  authSlice,
  selectAccessToken,
  selectHydrationDone,
} from "@/features/auth/authSlice";
import {
  setRefreshSuccessCallback,
  setRefreshFailureCallback,
} from "@/lib/api/client";
import { setAccessToken } from "@/lib/auth/tokenStore";

/**
 * Runs once on app load: if no access token in memory, calls refresh to restore session.
 * Registers API client callbacks so 401 refresh success/failure update Redux and redirect.
 */
export default function AuthHydration({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const accessToken = useSelector(selectAccessToken);
  const hydrationDone = useSelector(selectHydrationDone);

  useEffect(() => {
    setRefreshSuccessCallback((token, user) => {
      setAccessToken(token);
      store.dispatch(authSlice.actions.updateSession({ accessToken: token, user }));
    });
    setRefreshFailureCallback(() => {
      store.dispatch(authSlice.actions.clearSession());
      if (typeof window !== "undefined") {
        router.replace("/login");
      }
    });
  }, [router]);

  useEffect(() => {
    if (hydrationDone) return;
    if (accessToken) {
      store.dispatch(authSlice.actions.setHydrationDone(true));
      return;
    }
    void dispatch(refreshSession());
  }, [dispatch, accessToken, hydrationDone]);

  return <>{children}</>;
}
