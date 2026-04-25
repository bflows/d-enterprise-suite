"use client";

import type { MouseEvent as ReactMouseEvent, UIEvent } from "react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { HiCheck, HiOutlineClock } from "react-icons/hi2";

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

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** iOS-style wheel: item height in px (must match Tailwind h-10). */
const ITEM_H = 40;
const WHEEL_VIEWPORT_H = 200;
const WHEEL_PAD = (WHEEL_VIEWPORT_H - ITEM_H) / 2;

/**
 * Mouse wheels send a large |deltaY| in pixels; the browser then scrolls by that many
 * pixels and skips many rows. We take over wheel handling and move exactly one row per
 * event (sign only) so every slot is reachable on desktop. Trackpads may emit many
 * small events; each still moves at most one row.
 */
function moveWheelOneStep(el: HTMLDivElement, direction: 1 | -1): void {
  const maxTop = el.scrollHeight - el.clientHeight;
  if (maxTop <= 0) return;
  const next = clamp(el.scrollTop + direction * ITEM_H, 0, maxTop);
  if (next !== el.scrollTop) {
    el.scrollTop = next;
  }
}

export interface TimePickerProps {
  /** 24h `HH:MM` (e.g. `09:00`). Empty string means no time chosen yet. */
  value?: string;
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
  value: valueProp,
  onChange,
  id: idProp,
  className = "",
  disabled = false,
  emptyLabel = "Pick a time",
  popoverRole = "dialog",
  "aria-label": ariaLabel = "Time",
}: TimePickerProps) {
  /** Trimmed; empty or whitespace-only means no selection (show placeholder, not 9:00). */
  const value = (valueProp ?? "").trim();
  const autoId = useId();
  const id = idProp ?? `time-picker-${autoId}`;
  const panelId = `${id}-panel`;

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

  const defaultParts = useMemo(() => from24h(9, 0), []);
  const effectiveParts = parts ?? defaultParts;

  const [open, setOpen] = useState(false);
  const [centerIndices, setCenterIndices] = useState({ iH: 0, iM: 0, iP: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLDivElement | null>(null);
  const minuteRef = useRef<HTMLDivElement | null>(null);
  const periodRef = useRef<HTMLDivElement | null>(null);
  const isProgrammaticRef = useRef(false);
  const programmaticScrollTRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setTime = useCallback(
    (period: Period, hour12: number, minute: number) => {
      const { h, m } = to24h(period, hour12, minute);
      onChange(toHhMm(h, m));
    },
    [onChange]
  );

  const partsToScrollIndices = (p: { period: Period; hour12: number; m: number }) => {
    return {
      iH: clamp(HOURS_12.indexOf(p.hour12 as (typeof HOURS_12)[number]), 0, 11),
      iM: clamp(
        MINUTES_QUARTER.indexOf(p.m as (typeof MINUTES_QUARTER)[number]),
        0,
        3
      ),
      iP: p.period === "AM" ? 0 : 1,
    };
  };

  const scrollWheelsToParts = useCallback(
    (p: { period: Period; hour12: number; m: number }, behavior: ScrollBehavior) => {
      const { iH, iM, iP } = partsToScrollIndices(p);
      const top = (idx: number) => idx * ITEM_H;
      if (programmaticScrollTRef.current) {
        clearTimeout(programmaticScrollTRef.current);
        programmaticScrollTRef.current = null;
      }
      isProgrammaticRef.current = true;
      hourRef.current?.scrollTo({ top: top(iH), behavior });
      minuteRef.current?.scrollTo({ top: top(iM), behavior });
      periodRef.current?.scrollTo({ top: top(iP), behavior });
      programmaticScrollTRef.current = setTimeout(() => {
        programmaticScrollTRef.current = null;
        isProgrammaticRef.current = false;
      }, 64);
    },
    []
  );

  const readIndicesFromWheels = useCallback((): { iH: number; iM: number; iP: number } | null => {
    const hEl = hourRef.current;
    const mEl = minuteRef.current;
    const pEl = periodRef.current;
    if (!hEl || !mEl || !pEl) return null;
    return {
      iH: clamp(Math.round(hEl.scrollTop / ITEM_H), 0, 11),
      iM: clamp(Math.round(mEl.scrollTop / ITEM_H), 0, 3),
      iP: clamp(Math.round(pEl.scrollTop / ITEM_H), 0, 1),
    };
  }, []);

  const commitFromWheels = useCallback(() => {
    const r = readIndicesFromWheels();
    if (!r) return;
    setTime(
      PERIODS[r.iP],
      HOURS_12[r.iH],
      MINUTES_QUARTER[r.iM]
    );
  }, [readIndicesFromWheels, setTime]);

  const handleConfirmTime = useCallback(
    (e: ReactMouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      isProgrammaticRef.current = false;
      commitFromWheels();
      setOpen(false);
    },
    [commitFromWheels]
  );

  const wasOpenRef = useRef(false);
  useLayoutEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    scrollWheelsToParts(effectiveParts, "instant");
    const raf = requestAnimationFrame(() => {
      const r = readIndicesFromWheels();
      if (r) {
        setCenterIndices({ iH: r.iH, iM: r.iM, iP: r.iP });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [open, effectiveParts, scrollWheelsToParts, readIndicesFromWheels]);

  const scrollCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!open) {
      scrollCleanupRef.current?.();
      scrollCleanupRef.current = null;
      return;
    }

    const makeWheel = (el: HTMLDivElement) => {
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.deltaY === 0) return;
        if (isProgrammaticRef.current) return;
        const direction: 1 | -1 = e.deltaY > 0 ? 1 : -1;
        moveWheelOneStep(el, direction);
      };
      el.addEventListener("wheel", onWheel, { passive: false });
      return () => el.removeEventListener("wheel", onWheel);
    };

    const h = hourRef.current;
    const m = minuteRef.current;
    const p = periodRef.current;
    const wh = h && makeWheel(h);
    const wm = m && makeWheel(m);
    const wp = p && makeWheel(p);

    scrollCleanupRef.current = () => {
      wh?.();
      wm?.();
      wp?.();
    };

    return () => {
      scrollCleanupRef.current?.();
      scrollCleanupRef.current = null;
    };
  }, [open]);

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

  const hasValue = Boolean(parsed);
  const display = formatDisplayTime(value, emptyLabel);

  const openOrToggle = useCallback(() => {
    if (disabled) return;
    if (open) {
      setOpen(false);
    } else {
      setOpen(true);
    }
  }, [disabled, open]);

  const wheelListClass =
    "h-full w-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain " +
    "[scrollbar-width:none] [-ms-overflow-style:none] " +
    "[&::-webkit-scrollbar]:hidden touch-pan-y";

  const wheelItemBaseClass =
    "flex h-10 shrink-0 cursor-default snap-center select-none items-center justify-center " +
    "text-p";

  const handleHourScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      if (isProgrammaticRef.current) return;
      const iH = clamp(
        Math.round(e.currentTarget.scrollTop / ITEM_H),
        0,
        11
      );
      setCenterIndices((prev) => (prev.iH === iH ? prev : { ...prev, iH }));
    },
    []
  );

  const handleMinuteScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      if (isProgrammaticRef.current) return;
      const iM = clamp(
        Math.round(e.currentTarget.scrollTop / ITEM_H),
        0,
        3
      );
      setCenterIndices((prev) => (prev.iM === iM ? prev : { ...prev, iM }));
    },
    []
  );

  const handlePeriodScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      if (isProgrammaticRef.current) return;
      const iP = clamp(
        Math.round(e.currentTarget.scrollTop / ITEM_H),
        0,
        1
      );
      setCenterIndices((prev) => (prev.iP === iP ? prev : { ...prev, iP }));
    },
    []
  );

  return (
    <div className={`relative ${className}`} ref={wrapRef}>
      <div
        className={`relative mt-2 flex w-full items-center rounded-lg border bg-neutral-50 text-p transition-shadow focus-within:ring-2 focus-within:ring-primary ${
          hasValue ? "border-neutral-300" : "border-neutral-200"
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      >
        {!hasValue && (
          <HiOutlineClock
            className="pointer-events-none absolute left-4 top-1/2 size-4 shrink-0 -translate-y-1/2 text-neutral-400"
            aria-hidden
          />
        )}
        <input
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="none"
          readOnly
          tabIndex={disabled ? -1 : 0}
          disabled={disabled}
          value={hasValue ? display : ""}
          placeholder={emptyLabel}
          aria-haspopup={popoverRole === "dialog" ? "dialog" : "listbox"}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={openOrToggle}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              openOrToggle();
            }
          }}
          className={`w-full min-w-0 cursor-pointer rounded-lg bg-transparent py-3 pr-4 text-p outline-none focus:ring-0 disabled:cursor-not-allowed ${
            hasValue ? "pl-4 text-neutral-800" : "pl-11 text-neutral-800 placeholder:text-neutral-400"
          }`}
        />
      </div>

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
            className="absolute left-0 right-0 z-50 mt-2 min-w-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50/95 p-1 shadow-lg backdrop-blur-sm"
          >
            <button
              type="button"
              onClick={handleConfirmTime}
              className="absolute right-1.5 top-1.5 z-30 rounded-lg p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Apply selected time"
            >
              <HiCheck className="size-5" aria-hidden />
            </button>
            <div className="flex min-h-0 min-w-0 gap-0">
            {/* Hour 1 (top) → 12 (bottom) — Apple order */}
            <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-l-lg bg-white">
              <div
                className="pointer-events-none absolute inset-0 z-1 flex items-center"
                aria-hidden
              >
                <div className="h-10 w-full rounded-l-lg border-y border-l border-primary/25 bg-primary" />
              </div>
              <div
                className="pointer-events-none absolute inset-x-0 top-0 z-3 h-1/2 bg-linear-to-b from-neutral-50 to-transparent"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 z-3 h-1/2 bg-linear-to-t from-neutral-50 to-transparent"
                aria-hidden
              />
              <div
                className="relative z-2 h-full min-h-0 bg-transparent"
                style={{ height: WHEEL_VIEWPORT_H }}
              >
                <div
                  ref={hourRef}
                  className={wheelListClass}
                  style={{
                    paddingTop: WHEEL_PAD,
                    paddingBottom: WHEEL_PAD,
                  }}
                  role="listbox"
                  aria-label={`${ariaLabel} hours`}
                  onScroll={handleHourScroll}
                >
                  {HOURS_12.map((h12, iH) => (
                    <div
                      key={h12}
                      className={`${wheelItemBaseClass} bg-transparent ${
                        centerIndices.iH === iH
                          ? "text-neutral-50"
                          : "text-neutral-600"
                      }`}
                      role="option"
                      aria-selected={centerIndices.iH === iH}
                    >
                      {h12}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-white">
              <div
                className="pointer-events-none absolute inset-0 z-1 flex items-center"
                aria-hidden
              >
                <div className="h-10 w-full border-y border-primary/25 bg-primary" />
              </div>
              <div
                className="pointer-events-none absolute inset-x-0 top-0 z-3 h-1/2 bg-linear-to-b from-neutral-50 to-transparent"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 z-3 h-1/2 bg-linear-to-t from-neutral-50 to-transparent"
                aria-hidden
              />
              <div
                className="relative z-2 h-full min-h-0 bg-transparent"
                style={{ height: WHEEL_VIEWPORT_H }}
              >
                <div
                  ref={minuteRef}
                  className={wheelListClass}
                  style={{
                    paddingTop: WHEEL_PAD,
                    paddingBottom: WHEEL_PAD,
                  }}
                  role="listbox"
                  aria-label={`${ariaLabel} minutes`}
                  onScroll={handleMinuteScroll}
                >
                  {MINUTES_QUARTER.map((m, iM) => (
                    <div
                      key={m}
                      className={`${wheelItemBaseClass} bg-transparent ${
                        centerIndices.iM === iM
                          ? "text-neutral-50"
                          : "text-neutral-600"
                      }`}
                      role="option"
                      aria-selected={centerIndices.iM === iM}
                    >
                      {String(m).padStart(2, "0")}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-r-lg bg-white">
              <div
                className="pointer-events-none absolute inset-0 z-1 flex items-center"
                aria-hidden
              >
                <div className="h-10 w-full rounded-r-lg border-y border-r border-primary/25 bg-primary" />
              </div>
              <div
                className="pointer-events-none absolute inset-x-0 top-0 z-3 h-1/2 bg-linear-to-b from-neutral-50 to-transparent"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 z-3 h-1/2 bg-linear-to-t from-neutral-50 to-transparent"
                aria-hidden
              />
              <div
                className="relative z-2 h-full min-h-0 bg-transparent"
                style={{ height: WHEEL_VIEWPORT_H }}
              >
                <div
                  ref={periodRef}
                  className={wheelListClass}
                  style={{
                    paddingTop: WHEEL_PAD,
                    paddingBottom: WHEEL_PAD,
                  }}
                  role="listbox"
                  aria-label={`${ariaLabel} period`}
                  onScroll={handlePeriodScroll}
                >
                  {PERIODS.map((p, iP) => (
                    <div
                      key={p}
                      className={`${wheelItemBaseClass} bg-transparent ${
                        centerIndices.iP === iP
                          ? "text-neutral-50"
                          : "text-neutral-600"
                      }`}
                      role="option"
                      aria-selected={centerIndices.iP === iP}
                    >
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
