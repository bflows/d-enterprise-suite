"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { HiChevronLeft, HiChevronRight, HiOutlineCalendar } from "react-icons/hi2";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function parseYmd(ymd: string): { y: number; m0: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (mo < 0 || mo > 11 || d < 1 || d > 31) return null;
  const check = new Date(y, mo, d);
  if (check.getFullYear() !== y || check.getMonth() !== mo || check.getDate() !== d) {
    return null;
  }
  return { y, m0: mo, d };
}

function toYmd(y: number, m0: number, d: number): string {
  return `${y}-${String(m0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m0: number): number {
  return new Date(y, m0 + 1, 0).getDate();
}

function formatDisplayLabel(ymd: string, emptyLabel: string): string {
  const p = parseYmd(ymd);
  if (!p) return emptyLabel;
  const date = new Date(p.y, p.m0, p.d);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  /** `YYYY-MM-DD` — no day before this is selectable. Days before **today** are always disabled; if this is set, the first selectable day is the later of today and this date. */
  minDate?: string;
  /** `YYYY-MM-DD` — no day after this is selectable. */
  maxDate?: string;
  disabled?: boolean;
  emptyLabel?: string;
  /** "dialog" is appropriate inside modals. */
  popoverRole?: "dialog" | "listbox";
}

export default function DatePicker({
  value,
  onChange,
  id: idProp,
  className = "",
  minDate,
  maxDate,
  disabled = false,
  emptyLabel = "Pick a date",
  popoverRole = "dialog",
}: DatePickerProps) {
  const autoId = useId();
  const id = idProp ?? `date-picker-${autoId}`;
  const listId = `${id}-grid`;

  const parsedValue = useMemo(() => (value ? parseYmd(value) : null), [value]);
  const parsedMin = useMemo(() => (minDate ? parseYmd(minDate) : null), [minDate]);
  const parsedMax = useMemo(() => (maxDate ? parseYmd(maxDate) : null), [maxDate]);

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [viewY, setViewY] = useState(() => {
    if (parsedValue) return parsedValue.y;
    return new Date().getFullYear();
  });
  const [viewM0, setViewM0] = useState(() => {
    if (parsedValue) return parsedValue.m0;
    return new Date().getMonth();
  });

  const openPicker = useCallback(() => {
    const p = value ? parseYmd(value) : null;
    if (p) {
      setViewY(p.y);
      setViewM0(p.m0);
    } else {
      const n = new Date();
      setViewY(n.getFullYear());
      setViewM0(n.getMonth());
    }
    setOpen(true);
  }, [value]);

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

  const stepMonth = (delta: number) => {
    setViewM0((m0) => {
      const next = m0 + delta;
      if (next > 11) {
        setViewY((y) => y + 1);
        return 0;
      }
      if (next < 0) {
        setViewY((y) => y - 1);
        return 11;
      }
      return next;
    });
  };

  const isDisabledDay = useCallback(
    (y: number, m0: number, d: number, todayInt: number): boolean => {
      const t = y * 1e4 + m0 * 100 + d;
      let minInt = todayInt;
      if (parsedMin) {
        const propMin = parsedMin.y * 1e4 + parsedMin.m0 * 100 + parsedMin.d;
        minInt = Math.max(minInt, propMin);
      }
      if (t < minInt) return true;
      if (parsedMax) {
        const b = parsedMax.y * 1e4 + parsedMax.m0 * 100 + parsedMax.d;
        if (t > b) return true;
      }
      return false;
    },
    [parsedMin, parsedMax]
  );

  const monthLabel = useMemo(
    () =>
      new Date(viewY, viewM0, 1).toLocaleString(undefined, {
        month: "long",
        year: "numeric",
      }),
    [viewY, viewM0]
  );

  const cells = useMemo(() => {
    const dim = daysInMonth(viewY, viewM0);
    const first = new Date(viewY, viewM0, 1).getDay();
    const out: { y: number; m0: number; d: number; inMonth: boolean }[] = [];
    const prevDim = viewM0 === 0 ? daysInMonth(viewY - 1, 11) : daysInMonth(viewY, viewM0 - 1);
    for (let i = 0; i < first; i += 1) {
      const d = prevDim - first + 1 + i;
      if (viewM0 === 0) {
        out.push({ y: viewY - 1, m0: 11, d, inMonth: false });
      } else {
        out.push({ y: viewY, m0: viewM0 - 1, d, inMonth: false });
      }
    }
    for (let d = 1; d <= dim; d += 1) {
      out.push({ y: viewY, m0: viewM0, d, inMonth: true });
    }
    const tail = 42 - out.length;
    for (let d = 1; d <= tail; d += 1) {
      if (viewM0 === 11) {
        out.push({ y: viewY + 1, m0: 0, d, inMonth: false });
      } else {
        out.push({ y: viewY, m0: viewM0 + 1, d, inMonth: false });
      }
    }
    return out;
  }, [viewY, viewM0]);

  const now = new Date();
  const todayInt = now.getFullYear() * 1e4 + now.getMonth() * 100 + now.getDate();

  return (
    <div className={`relative ${className}`} ref={wrapRef}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup={popoverRole === "dialog" ? "dialog" : "listbox"}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => {
          if (disabled) return;
          if (open) {
            setOpen(false);
          } else {
            openPicker();
          }
        }}
        className={`mt-2 flex w-full items-center gap-3 rounded-lg border bg-neutral-50 px-4 py-3 text-left text-p transition-shadow focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50 ${parsedValue ? "border-neutral-300" : "border-neutral-200"
          }`}
      >
        {parsedValue ? "" : (
          <HiOutlineCalendar className="size-4 shrink-0 text-neutral-400" aria-hidden />
        )}
        <span className={parsedValue ? "text-neutral-800" : "text-neutral-400"}>
          {formatDisplayLabel(value, emptyLabel)}
        </span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            id={listId}
            role={popoverRole}
            aria-labelledby={`${id}-title`}
            className="absolute left-0 right-0 z-50 mt-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 shadow"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <button
                type="button"
                className="rounded-lg p-1.5 text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={() => stepMonth(-1)}
                aria-label="Previous month"
              >
                <HiChevronLeft className="size-5" />
              </button>
              <h3 id={`${id}-title`} className="text-p font-bold text-neutral-800">
                {monthLabel}
              </h3>
              <button
                type="button"
                className="rounded-lg p-1.5 text-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={() => stepMonth(1)}
                aria-label="Next month"
              >
                <HiChevronRight className="size-5" />
              </button>
            </div>
            <div
              className="grid grid-cols-7 gap-y-1 text-center text-small font-bold text-neutral-400"
              aria-hidden
            >
              {WEEKDAYS.map((w) => (
                <div key={w}>
                  {w}
                </div>
              ))}
            </div>
            <div
              className="mt-2 grid grid-cols-7 gap-1"
              role="grid"
              aria-label="Calendar"
            >
              {cells.map((cell, index) => {
                const ymd = toYmd(cell.y, cell.m0, cell.d);
                const t = cell.y * 1e4 + cell.m0 * 100 + cell.d;
                const isBeforeToday = t < todayInt;
                const isSelected = Boolean(parsedValue && ymd === value);
                const isToday =
                  cell.y === now.getFullYear() &&
                  cell.m0 === now.getMonth() &&
                  cell.d === now.getDate();
                const off = isDisabledDay(cell.y, cell.m0, cell.d, todayInt);
                return (
                  <button
                    type="button"
                    key={`day-${ymd}-${index}`}
                    disabled={off}
                    onClick={() => {
                      onChange(ymd);
                      setOpen(false);
                    }}
                    className={[
                      "min-h-9 rounded-full text-sm",
                      isSelected && "bg-primary font-bold text-neutral-50",
                      !isSelected && !cell.inMonth && "text-neutral-300",
                      !isSelected && cell.inMonth && "text-neutral-600",
                      !isSelected &&
                      isToday &&
                      cell.inMonth &&
                      "ring-1 ring-inset ring-primary/40",
                      !isSelected && cell.inMonth && !isToday && "hover:bg-neutral-200",
                      isBeforeToday && "line-through decoration-neutral-500",
                      off && "cursor-not-allowed opacity-30",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {cell.d}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
