"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getDaysInMonth,
  getWeekDates,
  formatMonthYear,
  formatWeekRange,
  toDateKey,
  type Job,
} from "@/lib/calendar/types";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { useRouter } from "next/navigation";
import JobCard from "./JobCard";
import { jobSlug } from "@/lib/utils/slug";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface CalendarProps {
  companyId?: string;
  jobs: Job[];
  onJobUpdate?: (job: Job) => void;
  onJobDelete?: (id: string) => void;
}

export default function Calendar({ jobs }: CalendarProps) {
  const router = useRouter();
  /** Avoid SSR/client mismatch: server TZ vs browser TZ for `new Date()` and calendar math. */
  const [viewDate, setViewDate] = useState<Date | null>(null);

  useEffect(() => {
    queueMicrotask(() => setViewDate(new Date()));
  }, []);

  const jobsByDate = useMemo(() => {
    const map = new Map<string, Job[]>();
    for (const job of jobs) {
      const list = map.get(job.date) ?? [];
      list.push(job);
      map.set(job.date, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [jobs]);

  const monthDays = useMemo(() => {
    if (!viewDate) return [];
    return getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
  }, [viewDate]);

  const weekDays = useMemo(() => {
    if (!viewDate) return [];
    return getWeekDates(viewDate);
  }, [viewDate]);

  const goPrev = () => {
    setViewDate((d) => {
      const base = d ?? new Date();
      const next = new Date(base);
      next.setDate(next.getDate() - 7);
      return next;
    });
  };

  const goNext = () => {
    setViewDate((d) => {
      const base = d ?? new Date();
      const next = new Date(base);
      next.setDate(next.getDate() + 7);
      return next;
    });
  };

  const goPrevMonth = () => {
    setViewDate((d) => {
      const base = d ?? new Date();
      const next = new Date(base);
      next.setMonth(next.getMonth() - 1);
      return next;
    });
  };

  const goNextMonth = () => {
    setViewDate((d) => {
      const base = d ?? new Date();
      const next = new Date(base);
      next.setMonth(next.getMonth() + 1);
      return next;
    });
  };

  const handleJobClick = (job: Job) => {
    const slug = jobSlug(job.title ?? job.customerName, job.id);
    router.push(`/job/${slug}`);
  };

  if (!viewDate) {
    return (
      <div
        className="flex flex-col gap-4 animate-pulse"
        aria-busy="true"
        aria-label="Loading calendar"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="h-10 w-full max-w-md rounded-lg bg-neutral-200" />
        </div>
        <div className="hidden md:grid grid-cols-7 gap-1 md:gap-2">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="h-6 rounded bg-neutral-200"
            />
          ))}
        </div>
        <div className="hidden md:grid grid-cols-7 gap-1 md:gap-2">
          {Array.from({ length: 42 }).map((_, i) => (
            <div
              key={i}
              className="min-h-25 md:min-h-30 rounded-lg bg-neutral-200"
            />
          ))}
        </div>
        <div className="md:hidden space-y-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-32 rounded-lg bg-neutral-200" />
          ))}
        </div>
      </div>
    );
  }

  const renderDayCell = (d: Date, isCurrentMonth: boolean) => {
    const key = toDateKey(d);
    const dayJobs = jobsByDate.get(key) ?? [];
    const isToday =
      d.getDate() === new Date().getDate() &&
      d.getMonth() === new Date().getMonth() &&
      d.getFullYear() === new Date().getFullYear();

    return (
      <div
        key={key}
        className={`
          min-h-25 md:min-h-30 flex flex-col border border-neutral-300 bg-neutral-50 rounded-lg overflow-hidden
          ${!isCurrentMonth ? "opacity-60" : ""}
          ${isToday ? "ring-2 ring-primary ring-inset" : ""}
        `}
        data-date={key}
      >
        <div className="shrink-0 flex items-center justify-between px-2 py-1 border-b border-neutral-200 bg-neutral-100/80">
          <span
            className={`text-small font-semibold ${isToday ? "text-primary" : "text-neutral-700"
              }`}
          >
            {d.getDate()}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-1 space-y-1">
          {dayJobs.map((job) => (
            <JobCard key={job.id} job={job} onClick={() => handleJobClick(job)} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col sm:mt-6">
      {/* Header: nav + title */}
      <div className="flex items-center justify-between md:justify-start w-full">
        <button
          type="button"
          onClick={goPrev}
          className="md:hidden p-2 rounded-full cursor-pointer border border-neutral-300 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Previous week"
        >
          <LuChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          onClick={goPrevMonth}
          className="hidden md:flex p-2 rounded-full cursor-pointer border border-neutral-300 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Previous month"
        >
          <LuChevronLeft className="size-5" />
        </button>

        <h2 className="text-h6 flex justify-center font-bold text-neutral-900 min-w-50 text-center md:text-left">
          <span className="md:hidden">{formatWeekRange(weekDays)}</span>
          <span className="hidden md:inline">{formatMonthYear(viewDate)}</span>
        </h2>

        <button
          type="button"
          onClick={goNext}
          className="md:hidden p-2 rounded-full cursor-pointer border border-neutral-300 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Next week"
        >
          <LuChevronRight className="size-5" />
        </button>
        <button
          type="button"
          onClick={goNextMonth}
          className="hidden md:flex p-2 rounded-full cursor-pointer border border-neutral-300 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Next month"
        >
          <LuChevronRight className="size-5" />
        </button>
      </div>

      {/* Weekday labels (month view only) */}
      <div className="hidden mt-4 grid-cols-7 gap-1 md:grid md:gap-2">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-small font-semibold text-neutral-600 py-1"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Month view (desktop): 6 rows × 7 days */}
      <div className="hidden md:grid grid-cols-7 gap-1 md:gap-2">
        {monthDays.map((d) => {
          const currentMonth = viewDate.getMonth();
          const isCurrentMonth = d.getMonth() === currentMonth;
          return renderDayCell(d, isCurrentMonth);
        })}
      </div>

      {/* Week view (mobile): days stacked vertically, jobs under each day */}
      <div className="md:hidden mt-4 flex flex-col gap-y-2">
        {weekDays.map((d) => {
          const key = toDateKey(d);
          const dayJobs = jobsByDate.get(key) ?? [];
          // const currentMonth = viewDate.getMonth();
          // const isCurrentMonth = d.getMonth() === currentMonth;
          const isToday =
            d.getDate() === new Date().getDate() &&
            d.getMonth() === new Date().getMonth() &&
            d.getFullYear() === new Date().getFullYear();
          const dayLabel = d.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          });
          return (
            <section
              key={key}
              data-date={key}
              className={`
                rounded-lg ring-2 overflow-hidden
                
                ${isToday ? "bg-neutral-50 ring-primary" : "ring-neutral-300 bg-neutral-50"}
              `}
            >
              <div
                className={`
                  px-3 py-2 border-b font-bold text-small
                  ${isToday ? "bg-primary/10 text-primary border-primary/10" : "bg-neutral-100 border-neutral-200 text-neutral-600"}
                `}
              >
                {dayLabel}
                {dayJobs.length > 0 && (
                  <span className="ml-2 text-neutral-400 text-small">
                    ({dayJobs.length} job{dayJobs.length !== 1 ? "s" : ""})
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-y-1 px-2 py-2">
                {dayJobs.length === 0 ? (
                  <p className="text-small text-neutral-400">No jobs scheduled</p>
                ) : (
                  dayJobs.map((job) => (
                    <JobCard key={job.id} job={job} onClick={() => handleJobClick(job)} />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
