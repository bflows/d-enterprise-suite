"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "@/app/store";
import type { AuthenticatedUser } from "@/types/auth";
import { selectCurrentCompany } from "@/features/auth/authSlice";
import { getRecentTimeCards, type TimeCardDto } from "@/lib/api/timeCards";
import {
  clockInUser,
  clockOutUser,
  selectActiveTimeCard,
  selectIsClockedIn,
  selectTimeCardClockActionPending,
  selectTimeCardError,
  selectTimeCardFetching,
} from "@/features/timeCard/timeCardSlice";

/**
 * Elapsed shift: `0m` … `59m` under an hour; from 1h onward `1hr 0m`, `2hr 15m`, …
 * (Updates every second while clocked in.)
 */
const DISPLAY_REFRESH_MS = 1000;
const MS_PER_MINUTE = 60 * 1000;

function formatElapsedDisplay(clockedInAt: string): string {
  const start = new Date(clockedInAt).getTime();
  const elapsedMs = Math.max(0, Date.now() - start);
  const totalMinutes = Math.floor(elapsedMs / MS_PER_MINUTE);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) {
    return `${m}m`;
  }
  return `${h}hr ${m}m`;
}

function durationMs(card: TimeCardDto): number {
  const start = new Date(card.clockedInAt).getTime();
  const end = card.clockedOutAt
    ? new Date(card.clockedOutAt).getTime()
    : Date.now();
  return Math.max(0, end - start);
}

function formatHoursOneDecimal(ms: number): string {
  return (ms / (1000 * 60 * 60)).toFixed(1);
}

export default function TechnicianDashboard({ user }: { user: AuthenticatedUser }) {
  const dispatch = useDispatch<AppDispatch>();
  const currentCompany = useSelector(selectCurrentCompany);
  const activeTimeCard = useSelector(selectActiveTimeCard);
  const clockedIn = useSelector(selectIsClockedIn);
  const statusLoading = useSelector(selectTimeCardFetching);
  const actionLoading = useSelector(selectTimeCardClockActionPending);
  const reduxError = useSelector(selectTimeCardError);

  /** Avoid hydration mismatch: locale date and elapsed time differ server vs client. */
  const [clientNowReady, setClientNowReady] = useState(false);
  const [todayLine, setTodayLine] = useState<string | null>(null);

  /** Bumps on an interval while clocked in so we re-run `formatElapsedDisplay` with current time. */
  const [, setTick] = useState(0);

  const [weekHoursLabel, setWeekHoursLabel] = useState<string | null>(null);
  useEffect(() => {
    if (!currentCompany) return;
    let cancelled = false;
    void getRecentTimeCards()
      .then((cards) => {
        if (cancelled) return;
        const total = cards.reduce((acc, c) => acc + durationMs(c), 0);
        setWeekHoursLabel(`${formatHoursOneDecimal(total)} hrs`);
      })
      .catch(() => {
        if (!cancelled) setWeekHoursLabel("—");
      });
    return () => {
      cancelled = true;
    };
  }, [currentCompany, clockedIn, activeTimeCard?.clockedInAt, activeTimeCard?.clockedOutAt]);

  useEffect(() => {
    queueMicrotask(() => {
      setClientNowReady(true);
      setTodayLine(
        new Intl.DateTimeFormat("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        }).format(new Date())
      );
    });
  }, []);

  useEffect(() => {
    if (!clockedIn || !activeTimeCard?.clockedInAt) return;
    const id = window.setInterval(() => {
      setTick((n) => n + 1);
    }, DISPLAY_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [clockedIn, activeTimeCard?.clockedInAt]);

  const elapsedLabel =
    clockedIn && activeTimeCard?.clockedInAt
      ? clientNowReady
        ? formatElapsedDisplay(activeTimeCard.clockedInAt)
        : "…"
      : "Start working";

  async function onClockClick() {
    if (!currentCompany || actionLoading) return;
    try {
      if (clockedIn) {
        await dispatch(
          clockOutUser({ user, company: currentCompany })
        ).unwrap();
      } else {
        await dispatch(clockInUser({ user, company: currentCompany })).unwrap();
      }
    } catch {
      /* message stored in Redux via thunk reject */
    }
  }

  const canUseClock = Boolean(currentCompany) && !statusLoading;

  return (
    <div>
      <div>
        <div className="flex items-start justify-between gap-x-2">
          <h1 className="text-h6 font-bold text-neutral-900 md:text-h3">
            Welcome, {user.firstName}!
          </h1>
          <p className="py-1 px-3 rounded-full text-small bg-neutral-300 text-neutral-600 capitalize">
            {user.role}
          </p>
        </div>
        <p className="mt-2">Today is {todayLine ?? "—"}</p>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <div className="flex items-center gap-x-2">
          <button
            type="button"
            disabled={!canUseClock || actionLoading}
            onClick={() => void onClockClick()}
            className={`w-1/2 py-3 px-4 text-start rounded-lg flex flex-col cursor-pointer transition-all duration-300 ease-in-out  disabled:opacity-50 disabled:cursor-not-allowed ${
              clockedIn
                ? "bg-primary hover:bg-primary/90"
                : "border bg-neutral-50 border-neutral-300 hover:bg-neutral-100 hover:border-primary"
            }`}
          >
            <p
              className={`text-small ${clockedIn ? "text-neutral-200" : "text-neutral-800"}`}
            >
              {clockedIn ? "Clocked in" : "Clocked out"}
            </p>
            <h3
              className={`mt-1 text-p font-bold md:text-h6 ${
                clockedIn ? "text-neutral-100" : "text-neutral-900"
              }`}
            >
              {statusLoading || actionLoading
                ? "…"
                : clockedIn
                  ? elapsedLabel
                  : "Start working"}
            </h3>
          </button>
          <Link
            href="/dashboard/time-cards"
            className="w-1/2 py-3 px-4 text-start rounded-lg flex flex-col border bg-neutral-50 border-neutral-300 hover:bg-neutral-100 hover:border-primary transition-all duration-300 ease-in-out"
          >
            <p className="text-small text-neutral-800">This week</p>
            <h3 className="mt-1 text-p font-bold text-neutral-900 md:text-h6">
              {!currentCompany ? "—" : weekHoursLabel ?? "…"}
            </h3>
            <span className="sr-only">View time cards for the last 7 days</span>
          </Link>
        </div>
        {!currentCompany && (
          <p className="text-small text-neutral-600">
            Select a company context to use the clock. Refresh the page or log in again if this persists.
          </p>
        )}
        {reduxError && <p className="text-small text-red-700">{reduxError}</p>}
      </div>
    </div>
  );
}
