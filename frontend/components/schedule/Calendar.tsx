"use client";

import React, { useMemo, useState } from "react";
import {
  getDaysInMonth,
  getWeekDates,
  formatMonthYear,
  formatWeekRange,
  toDateKey,
  type Job,
} from "@/lib/calendar/types";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import JobCard from "./JobCard";
import JobDetailModal from "./JobDetailModal";
import Modal from "@/components/ui/Modal";
import { deleteJob, updateJob, mapApiJobToJob } from "@/lib/api/jobs";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface CalendarProps {
  companyId?: string;
  jobs: Job[];
  onJobUpdate?: (job: Job) => void;
  onJobDelete?: (id: string) => void;
}

export default function Calendar({ companyId, jobs, onJobUpdate, onJobDelete }: CalendarProps) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
    return getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
  }, [viewDate]);

  const weekDays = useMemo(() => {
    return getWeekDates(viewDate);
  }, [viewDate]);

  const goPrev = () => {
    setViewDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() - 7);
      return next;
    });
  };

  const goNext = () => {
    setViewDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 7);
      return next;
    });
  };

  const goPrevMonth = () => {
    setViewDate((d) => {
      const next = new Date(d);
      next.setMonth(next.getMonth() - 1);
      return next;
    });
  };

  const goNextMonth = () => {
    setViewDate((d) => {
      const next = new Date(d);
      next.setMonth(next.getMonth() + 1);
      return next;
    });
  };

  const handleJobClick = (job: Job) => {
    setSelectedJob(job);
    setIsEditMode(false);
  };

  const handleCloseModal = () => {
    setSelectedJob(null);
    setIsEditMode(false);
    setSaveError(null);
  };

  const handleSave = async (updated: Job) => {
    setSaveError(null);
    setSaveLoading(true);
    try {
      const res = await updateJob(updated.id, {
        title: updated.title ?? null,
        startDate: updated.date,
        endDate: updated.date,
        startTime: updated.startTime,
        endTime: updated.endTime || updated.startTime,
        notes: updated.notes ?? null,
        status: updated.status,
        ...(updated.technicianId != null && { technicianId: updated.technicianId }),
      });
      const job = mapApiJobToJob(res.job);
      onJobUpdate?.(job);
      setSelectedJob(job);
      setIsEditMode(false);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? String((err as { response?: { data?: { message?: string } } }).response?.data?.message)
          : "Failed to update job.";
      setSaveError(message ?? "Failed to update job.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleRequestDelete = (job: Job) => {
    setSelectedJob(null);
    setIsEditMode(false);
    setJobToDelete(job);
    setDeleteConfirmOpen(true);
    setDeleteError(null);
  };

  const handleConfirmDeleteClose = () => {
    if (!deleteLoading) {
      setDeleteConfirmOpen(false);
      setJobToDelete(null);
      setDeleteError(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!jobToDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteJob(jobToDelete.id);
      onJobDelete?.(jobToDelete.id);
      setDeleteConfirmOpen(false);
      setJobToDelete(null);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? String((err as { response?: { data?: { message?: string } } }).response?.data?.message)
          : "Failed to delete job.";
      setDeleteError(message ?? "Failed to delete job.");
    } finally {
      setDeleteLoading(false);
    }
  };

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
            className={`text-small font-semibold ${
              isToday ? "text-primary" : "text-neutral-700"
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
    <div className="flex flex-col gap-4">
      {/* Header: nav + title */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            className="md:hidden p-2 rounded-lg cursor-pointer border border-neutral-400 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Previous week"
          >
            <LuChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={goPrevMonth}
            className="hidden md:flex p-2 rounded-lg cursor-pointer border border-neutral-400 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary"
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
            className="md:hidden p-2 rounded-lg cursor-pointer border border-neutral-400 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Next week"
          >
            <LuChevronRight className="size-5" />
          </button>
          <button
            type="button"
            onClick={goNextMonth}
            className="hidden md:flex p-2 rounded-lg cursor-pointer border border-neutral-400 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Next month"
          >
            <LuChevronRight className="size-5" />
          </button>
        </div>
      </div>

      {/* Weekday labels (month view only) */}
      <div className="hidden md:grid grid-cols-7 gap-1 md:gap-2">
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
      <div className="md:hidden space-y-4">
        {weekDays.map((d) => {
          const key = toDateKey(d);
          const dayJobs = jobsByDate.get(key) ?? [];
          const currentMonth = viewDate.getMonth();
          const isCurrentMonth = d.getMonth() === currentMonth;
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
                rounded-lg border overflow-hidden
                ${!isCurrentMonth ? "opacity-60" : ""}
                ${isToday ? "border-primary ring-2 ring-primary/30" : "border-neutral-300 bg-neutral-50"}
              `}
            >
              <div
                className={`
                  px-3 py-2 border-b font-semibold text-small
                  ${isToday ? "bg-primary/15 text-primary border-primary/30" : "bg-neutral-100/80 border-neutral-200 text-neutral-800"}
                `}
              >
                {dayLabel}
                {dayJobs.length > 0 && (
                  <span className="ml-2 text-neutral-500 font-normal">
                    ({dayJobs.length} job{dayJobs.length !== 1 ? "s" : ""})
                  </span>
                )}
              </div>
              <div className="p-2 space-y-2 min-h-12">
                {dayJobs.length === 0 ? (
                  <p className="text-small text-neutral-500 italic py-2">No jobs scheduled</p>
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

      <JobDetailModal
        companyId={companyId}
        job={selectedJob}
        isOpen={!!selectedJob}
        isEditMode={isEditMode}
        onClose={handleCloseModal}
        onEdit={() => setIsEditMode(true)}
        onSave={handleSave}
        onRequestDelete={handleRequestDelete}
        saveLoading={saveLoading}
        saveError={saveError}
      />

      <Modal
        isOpen={deleteConfirmOpen}
        onClose={handleConfirmDeleteClose}
        title="Delete job"
        cancelLabel="Cancel"
        primaryAction={{
          label: deleteLoading ? "Deleting…" : "Delete",
          onClick: handleConfirmDelete,
          disabled: deleteLoading,
        }}
      >
        <div className="space-y-3">
          {jobToDelete && (
            <p className="text-p text-neutral-700">
              Are you sure you want to delete{" "}
              <strong>{jobToDelete.title?.trim() || jobToDelete.customerName || "this job"}</strong>?
              This cannot be undone.
            </p>
          )}
          {deleteError && (
            <p className="text-sm text-red-600 bg-red-50 py-2 px-3 rounded-lg" role="alert">
              {deleteError}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
