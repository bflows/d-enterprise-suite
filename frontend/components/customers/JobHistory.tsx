"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import axios from "axios";
import { HiCalendar, HiOutlineWrench } from "react-icons/hi2";
import { HiOutlineLocationMarker } from "react-icons/hi";
import { listJobs } from "@/lib/api/jobs";
import { formatInvoiceStatus, type Job } from "@/lib/calendar/types";
import { jobSlug } from "@/lib/utils/slug";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

function formatJobStatus(status: Job["status"]): string {
  const labels: Record<Job["status"], string> = {
    scheduled: "Scheduled",
    en_route: "En route",
    in_progress: "In progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[status] ?? status;
}

function jobTitleLine(job: Job): string {
  if (job.title?.trim()) return job.title.trim();
  if (job.customerName?.trim()) return job.customerName.trim();
  return "Job";
}

function formatJobStartTime(time: string): string {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(time.trim());
  if (!match) return time;

  const hours24 = Number(match[1]);
  const minutes = match[2];
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${minutes} ${meridiem}`;
}

function sortJobsNewestFirst(jobs: Job[]): Job[] {
  return [...jobs].sort(
    (a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime)
  );
}

export type JobHistoryProps = {
  companyId: string;
  customerId: string;
};

export default function JobHistory({ companyId, customerId }: JobHistoryProps) {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || !customerId) return;
    let cancelled = false;
    void listJobs({ customerId })
      .then((list) => {
        if (!cancelled) {
          setJobs(sortJobsNewestFirst(list));
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setJobs([]);
        const msg =
          axios.isAxiosError(err) &&
            err.response?.data &&
            typeof err.response.data === "object" &&
            "message" in err.response.data &&
            typeof (err.response.data as { message?: unknown }).message === "string"
            ? (err.response.data as { message: string }).message
            : "Could not load job history.";
        setError(msg);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, customerId]);

  const showLoading = jobs === null && !error;
  const empty = jobs !== null && jobs.length === 0 && !error;

  if (!companyId || !customerId) {
    return (
      <section className="mt-8">
        <div className="flex items-center gap-x-2 text-neutral-900">
          <div>
            <HiCalendar className="size-6" />
          </div>
          <h2 className="text-h6 font-bold md:text-h5">History</h2>
        </div>
        <p className="mt-1 text-small text-neutral-600">Cannot load jobs for this customer.</p>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <div className="flex items-center gap-x-2 text-neutral-900">
        <div>
          <HiCalendar className="size-6" />
        </div>
        <h2 className="text-h6 font-bold md:text-h5">History</h2>
      </div>
      {error && (
        <p className="mt-2 text-small text-red-700" role="alert">
          {error}
        </p>
      )}
      {showLoading && (
        <div className="mt-4 flex flex-col items-center justify-center">
          <div className="inline-block size-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
          <p className="text-p font-bold mt-2 text-neutral-600">Loading jobs...</p>
        </div>
      )}
      {empty && (
        <p className="mt-4 rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-8 text-center text-neutral-600">
          No jobs yet for this customer.
        </p>
      )}
      {jobs !== null && jobs.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {jobs.map((job) => {
            const slug = jobSlug(job.title ?? job.customerName, job.id);
            const returnTo = `/customers/${customerId}`;
            const dateLabel = dateFmt.format(new Date(job.date + "T12:00:00"));
            const techLabel = job.technicianName?.trim() || "Technician";
            return (
              <li key={job.id}>
                <Link
                  href={`/job/${slug}?from=${encodeURIComponent(returnTo)}`}
                  className="block rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-3 transition-colors hover:border-primary hover:bg-neutral-100"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-small text-neutral-600">{dateLabel}</p>
                    <p className="text-p text-neutral-800">{formatJobStartTime(job.startTime)}</p>
                  </div>
                  <p className="mt-2 font-bold text-h6 text-neutral-900">{jobTitleLine(job)}</p>
                  <div className="mt-2 flex items-center gap-x-2 text-neutral-600">
                    <div>
                      <HiOutlineWrench className="size-5 text-primary" />
                    </div>
                    <p className="text-p">{techLabel}</p>
                  </div>
                  <div className="mt-1 flex items-center gap-x-2 text-neutral-600">
                    <div>
                      <HiOutlineLocationMarker className="size-5 text-primary" />
                    </div>
                    {job.address?.trim() && (
                      <p className="text-p">{job.address}</p>
                    )}
                  </div>
                  <p className="mt-4 w-fit rounded-full px-3 py-1 text-small capitalize bg-neutral-200 text-neutral-600">
                    {formatJobStatus(job.status)}
                    {job.invoice
                      ? ` · ${formatInvoiceStatus(job.invoice.status)}`
                      : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
