"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RequireRole from "@/components/auth/RequireRole";
import { getRecentTimeCards, type TimeCardDto } from "@/lib/api/timeCards";
import { ROLE_SLUGS } from "@/types/auth";

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

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

function formatRange(card: TimeCardDto): string {
  const inDate = new Date(card.clockedInAt);
  const out = card.clockedOutAt ? new Date(card.clockedOutAt) : null;
  const datePart = dateFmt.format(inDate);
  const inPart = timeFmt.format(inDate);
  const outPart = out ? timeFmt.format(out) : "—";
  return `${datePart} · ${inPart} – ${outPart}`;
}

export default function TimeCardsPage() {
  const [cards, setCards] = useState<TimeCardDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getRecentTimeCards()
      .then((list) => {
        if (!cancelled) {
          setCards(list);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load time cards.");
          setCards([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalMs =
    cards?.reduce((acc, c) => acc + durationMs(c), 0) ?? 0;
  const totalLabel =
    cards === null ? "…" : `${formatHoursOneDecimal(totalMs)} hours`;

  return (
    <RequireRole
      allowedRoles={[
        ROLE_SLUGS.TECHNICIAN,
        ROLE_SLUGS.DISPATCHER,
        ROLE_SLUGS.ADMIN,
      ]}
    >
      <div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="text-small text-primary hover:underline"
            >
              ← Dashboard
            </Link>
            <h1 className="mt-2 text-neutral-900 text-h4 font-bold">
              Your time cards
            </h1>
            <p className="mt-1 text-small text-neutral-600">
              Entries from the last 7 days (same range as on your dashboard).
            </p>
          </div>
          <div className="rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-3 sm:text-end">
            <p className="text-small text-neutral-600">Total (last 7 days)</p>
            <p className="text-h6 font-bold text-neutral-900">{totalLabel}</p>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-small text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-300">
          <table className="w-full min-w-[320px] text-left text-p">
            <thead className="border-b border-neutral-300 bg-neutral-100 text-small text-neutral-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Shift</th>
                <th className="px-4 py-3 font-semibold">Duration</th>
              </tr>
            </thead>
            <tbody>
              {cards === null ? (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-neutral-600">
                    Loading…
                  </td>
                </tr>
              ) : cards.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-neutral-600">
                    No time cards in the last 7 days.
                  </td>
                </tr>
              ) : (
                cards.map((card) => (
                  <tr
                    key={card.id}
                    className="border-b border-neutral-200 last:border-0"
                  >
                    <td className="px-4 py-3 text-neutral-900">
                      {formatRange(card)}
                    </td>
                    <td className="px-4 py-3 text-neutral-800">
                      {formatHoursOneDecimal(durationMs(card))} hrs
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </RequireRole>
  );
}
