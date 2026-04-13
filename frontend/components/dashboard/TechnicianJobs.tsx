"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { listTechnicianJobs } from "@/lib/api/jobs";
import { selectCurrentCompany } from "@/features/auth/authSlice";
import { toDateKey, type Job } from "@/lib/calendar/types";
import type { AuthenticatedUser } from "@/types/auth";
import { jobSlug } from "@/lib/utils/slug";
import axios from "axios";
import { HiCalendar, HiOutlineUser } from "react-icons/hi2";
import { HiOutlineLocationMarker } from "react-icons/hi";

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
    invoiced: "Invoiced",
    paid: "Paid",
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

/** Today through the next 7 days (inclusive of today), local time. `job.date` is YYYY-MM-DD. */
function filterJobsNext7Days(jobs: Job[]): Job[] {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 6);
  const start = toDateKey(startDate);
  const end = toDateKey(endDate);
  return jobs
    .filter(
      (j) =>
        j.date >= start &&
        j.date <= end &&
        j.status !== "completed" &&
        j.status !== "invoiced" &&
        j.status !== "paid"
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
}

function isScheduledToday(jobDate: string): boolean {
  return jobDate === toDateKey(new Date());
}

type TechnicianJobsListProps = {
  user: AuthenticatedUser;
  companyId: string;
  companyName: string;
};

/** Fetches jobs for one company; parent remounts this when `companyId` changes (`key`). */
function TechnicianJobsList({ user, companyId }: TechnicianJobsListProps) {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listTechnicianJobs(user.id, companyId)
      .then((list) => {
        if (!cancelled) {
          setJobs(filterJobsNext7Days(list));
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
            : "Could not load your jobs.";
        setError(msg);
      });
    return () => {
      cancelled = true;
    };
  }, [user.id, companyId]);

  const showLoading = jobs === null && !error;
  const empty = jobs !== null && jobs.length === 0 && !error;

  return (
    <>
      {error && (
        <p className="mt-2 text-small text-red-700" role="alert">
          {error}
        </p>
      )}
      {showLoading && (
        <div className="mt-4 flex items-center gap-x-3 rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-4">
          <div
            className="inline-block size-6 animate-spin rounded-full border-2 border-primary border-r-transparent"
            aria-hidden
          />
          <p className="text-neutral-800 text-p">Loading jobs…</p>
        </div>
      )}
      {empty && (
        <p className="mt-4 rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-8 text-center text-neutral-600">
          No jobs scheduled for you in the next 7 days.
        </p>
      )}
      {jobs !== null && jobs.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {jobs.map((job) => {
            const slug = jobSlug(job.title ?? job.customerName, job.id);
            const dateLabel = dateFmt.format(new Date(job.date + "T12:00:00"));
            const today = isScheduledToday(job.date);
            return (
              <li key={job.id}>
                <Link
                  href={`/job/${slug}`}
                  className={`block rounded-lg border px-4 py-3 transition-all duration-300 ease-in-out ring-transparent ring-2 ${
                    today
                      ? "border-primary bg-neutral-50 ring-primary hover:bg-neutral-100"
                      : "border-neutral-300 bg-neutral-50 hover:bg-neutral-100 hover:ring-primary"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-small text-neutral-600">{dateLabel}</p>
                    <p className="text-p text-neutral-800">{formatJobStartTime(job.startTime)}</p>
                  </div>
                  <p className="mt-2 font-bold text-h6 text-neutral-900">
                    {jobTitleLine(job)}
                  </p>
                  <div className="mt-2 flex items-center gap-x-2 text-neutral-600">
                    <div>
                      <HiOutlineUser className="size-5 text-primary" />
                    </div>
                    <p className="text-p">
                      {job.customerName}
                    </p>
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
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

type TechnicianJobsProps = {
  user: AuthenticatedUser;
};

export default function TechnicianJobs({ user }: TechnicianJobsProps) {
  const currentCompany = useSelector(selectCurrentCompany);

  return (
    <section className="mt-8">
      <div className="flex items-center gap-x-2 text-neutral-900">
        <div>
          <HiCalendar className="size-6" />
        </div>
        <h2 className="text-h6 font-bold md:text-h5">Jobs</h2>
      </div>
      {/* {!currentCompany && (
        <p className="mt-1 text-small text-neutral-600">
          Select a company to see your assigned jobs.
        </p>
      )} */}
      {currentCompany && (
        <TechnicianJobsList
          key={currentCompany.id}
          user={user}
          companyId={currentCompany.id}
          companyName={currentCompany.name}
        />
      )}
    </section>
  );
}
