"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { HiOutlineClock } from "react-icons/hi2";

function parseHhMm(s: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}

function toHhMm(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Snaps to 00, 15, 30, 45 and rolls the hour when needed. */
function snapToNearestQuarter(h: number, m: number): { h: number; m: number } {
  let rm = Math.round(m / 15) * 15;
  let rh = h;
  if (rm === 60) {
    rm = 0;
    rh = (h + 1) % 24;
  }
  return { h: rh, m: rm };
}

const HOURS_12 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const MINUTES_QUARTER = [0, 15, 30, 45] as const;
const PERIODS = ["AM", "PM"] as const;
type Period = (typeof PERIODS)[number];

function to24h(period: Period, hour12: number, minute: number): { h: number; m: number } {
  if (period === "AM") {
    if (hour12 === 12) return { h: 0, m: minute };
    return { h: hour12, m: minute };
  }
  if (hour12 === 12) return { h: 12, m: minute };
  return { h: hour12 + 12, m: minute };
}

function from24h(h: number, m: number): { period: Period; hour12: number; m: number } {
  const s = snapToNearestQuarter(h, m);
  const hh = s.h;
  const mm = s.m;
  if (hh === 0) return { period: "AM", hour12: 12, m: mm };
  if (hh < 12) return { period: "AM", hour12: hh, m: mm };
  if (hh === 12) return { period: "PM", hour12: 12, m: mm };
  return { period: "PM", hour12: hh - 12, m: mm };
}

function formatDisplayTime(hhMm: string, emptyLabel: string): string {
  const p = parseHhMm(hhMm);
  if (!p) return emptyLabel;
  const s = snapToNearestQuarter(p.h, p.m);
  const d = new Date(2000, 0, 1, s.h, s.m);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
  emptyLabel?: string;
  /** "dialog" is appropriate inside modals. */
  popoverRole?: "dialog" | "listbox";
  /** `aria-label` for the popover time lists (e.g. "Start time"). */
  "aria-label"?: string;
}

export default function TimePicker({
  value,
  onChange,
  id: idProp,
  className = "",
  disabled = false,
  emptyLabel = "Pick a time",
  popoverRole = "dialog",
  "aria-label": ariaLabel = "Time",
}: TimePickerProps) {
  const autoId = useId();
  const id = idProp ?? `time-picker-${autoId}`;
  const panelId = `${id}-panel`;

  // Keep stored value on quarter minutes when parent passes non-quarter times.
  useEffect(() => {
    const p = parseHhMm(value);
    if (!p) return;
    const s = snapToNearestQuarter(p.h, p.m);
    const next = toHhMm(s.h, s.m);
    if (next !== value) onChange(next);
  }, [value, onChange]);

  const parsed = useMemo(() => {
    const p = parseHhMm(value);
    if (!p) return null;
    return snapToNearestQuarter(p.h, p.m);
  }, [value]);

  const parts = useMemo(() => {
    if (!parsed) return null;
    return from24h(parsed.h, parsed.m);
  }, [parsed]);

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const periodRef = useRef<HTMLDivElement>(null);

  const openPicker = useCallback(() => {
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const defaultParts = useMemo(
    () => from24h(9, 0),
    []
  );

  const effectiveParts = parts ?? defaultParts;

  // Scroll selected values into view when the panel opens
  useEffect(() => {
    if (!open) return;
    const h12 = effectiveParts.hour12;
    const m = effectiveParts.m;
    const per = effectiveParts.period;
    const hourEl = hourRef.current?.querySelector<HTMLElement>(`[data-h12="${h12}"]`);
    const minuteEl = minuteRef.current?.querySelector<HTMLElement>(`[data-minute="${m}"]`);
    const periodEl = periodRef.current?.querySelector<HTMLElement>(`[data-period="${per}"]`);
    requestAnimationFrame(() => {
      hourEl?.scrollIntoView({ block: "center" });
      minuteEl?.scrollIntoView({ block: "center" });
      periodEl?.scrollIntoView({ block: "center" });
    });
  }, [open, effectiveParts.hour12, effectiveParts.m, effectiveParts.period]);

  const hasValue = Boolean(parsed);
  const display = formatDisplayTime(value, emptyLabel);

  const setTime = (period: Period, hour12: number, minute: number) => {
    const { h, m } = to24h(period, hour12, minute);
    onChange(toHhMm(h, m));
  };

  return (
    <div className={`relative ${className}`} ref={wrapRef}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup={popoverRole === "dialog" ? "dialog" : "listbox"}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => {
          if (disabled) return;
          if (open) {
            setOpen(false);
          } else {
            openPicker();
          }
        }}
        className={`mt-2 flex w-full items-center gap-3 rounded-lg border bg-neutral-50 px-4 py-3 text-left text-p transition-shadow focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50 ${
          hasValue ? "border-neutral-300" : "border-neutral-200"
        }`}
      >
        {!hasValue && (
          <HiOutlineClock className="size-4 shrink-0 text-neutral-400" aria-hidden />
        )}
        <span className={hasValue ? "text-neutral-800" : "text-neutral-400"}>{display}</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            id={panelId}
            role={popoverRole}
            aria-label={ariaLabel}
            className="absolute left-0 right-0 z-50 mt-2 flex max-h-64 gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 shadow"
          >
            <div
              className="flex min-h-0 min-w-0 flex-1 flex-col"
              ref={hourRef}
            >
              <span className="mb-1 text-center text-small font-bold text-neutral-500">
                Hour
              </span>
              <ul
                className="max-h-52 overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1"
                role="listbox"
                aria-label={`${ariaLabel} hours`}
              >
                {HOURS_12.map((h12) => {
                  const selected = effectiveParts.hour12 === h12;
                  return (
                    <li key={h12} role="presentation">
                      <button
                        type="button"
                        data-h12={h12}
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                          setTime(effectiveParts.period, h12, effectiveParts.m);
                        }}
                        className={[
                          "w-full px-3 py-1.5 text-center text-p",
                          selected
                            ? "bg-primary font-bold text-neutral-50"
                            : "text-neutral-700 hover:bg-neutral-100",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {h12}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div
              className="flex min-h-0 min-w-0 flex-1 flex-col"
              ref={minuteRef}
            >
              <span className="mb-1 text-center text-small font-bold text-neutral-500">
                Min
              </span>
              <ul
                className="max-h-52 overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1"
                role="listbox"
                aria-label={`${ariaLabel} minutes`}
              >
                {MINUTES_QUARTER.map((m) => {
                  const selected = effectiveParts.m === m;
                  return (
                    <li key={m} role="presentation">
                      <button
                        type="button"
                        data-minute={m}
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                          setTime(effectiveParts.period, effectiveParts.hour12, m);
                        }}
                        className={[
                          "w-full px-3 py-1.5 text-center text-p",
                          selected
                            ? "bg-primary font-bold text-neutral-50"
                            : "text-neutral-700 hover:bg-neutral-100",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {String(m).padStart(2, "0")}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div
              className="flex min-h-0 min-w-0 flex-1 flex-col"
              ref={periodRef}
            >
              <span className="mb-1 text-center text-small font-bold text-neutral-500">
                AM/PM
              </span>
              <ul
                className="max-h-52 overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1"
                role="listbox"
                aria-label={`${ariaLabel} period`}
              >
                {PERIODS.map((period) => {
                  const selected = effectiveParts.period === period;
                  return (
                    <li key={period} role="presentation">
                      <button
                        type="button"
                        data-period={period}
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                          setTime(period, effectiveParts.hour12, effectiveParts.m);
                        }}
                        className={[
                          "w-full px-3 py-1.5 text-center text-p",
                          selected
                            ? "bg-primary font-bold text-neutral-50"
                            : "text-neutral-700 hover:bg-neutral-100",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {period}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
