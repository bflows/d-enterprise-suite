"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { selectCurrentCompanyId } from "@/features/auth/authSlice";
import { LuPlus } from "react-icons/lu";
import type { Job } from "@/lib/calendar/types";
import Calendar from "@/components/schedule/Calendar";
import NewJobModal from "@/components/schedule/NewJobModal";
import { listJobs } from "@/lib/api/jobs";

export default function SchedulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyId = useSelector((state: RootState) =>
    selectCurrentCompanyId(state)
  );
  const [jobs, setJobs] = useState<Job[]>([]);
  const [newJobModalOpen, setNewJobModalOpen] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    const run = () => {
      setJobsLoading(true);
      setJobsError(null);
      listJobs()
        .then(setJobs)
        .catch(() => setJobsError("Failed to load jobs"))
        .finally(() => setJobsLoading(false));
    };
    queueMicrotask(run);
  }, [companyId]);

  // Defer setState to avoid synchronous setState in effect (cascading renders).
  useEffect(() => {
    if (searchParams.get("newJob") !== "1") return;
    queueMicrotask(() => {
      setNewJobModalOpen(true);
      router.replace("/schedule", { scroll: false });
    });
  }, [searchParams, router]);

  const displayJobs = companyId ? jobs : [];
  const displayLoading = companyId ? jobsLoading : false;

  const handleJobUpdate = useCallback((updated: Job) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === updated.id ? updated : j))
    );
  }, []);

  const handleJobDelete = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const handleJobCreate = useCallback((job: Job) => {
    setJobs((prev) => [...prev, job]);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-neutral-900 text-h4 font-bold">Schedule</h1>
        <button
          type="button"
          onClick={() => setNewJobModalOpen(true)}
          className="hidden text-p font-bold py-3 px-4 rounded-lg items-center gap-x-2 cursor-pointer transition-colors bg-primary text-neutral-200 hover:bg-primary/90 hover:text-neutral-50 sm:flex"
        >
          <LuPlus className="size-6" />
          New Job
        </button>
      </div>

      {jobsError && (
        <p className="text-secondary text-p">{jobsError}</p>
      )}

      {displayLoading ? (
        <p className="text-neutral-600 text-p">Loading schedule…</p>
      ) : (
        <Calendar
          companyId={companyId ?? undefined}
          jobs={displayJobs}
          onJobUpdate={handleJobUpdate}
          onJobDelete={handleJobDelete}
        />
      )}

      <NewJobModal
        isOpen={newJobModalOpen}
        onClose={() => setNewJobModalOpen(false)}
        onSave={handleJobCreate}
        existingJobs={displayJobs}
      />
    </div>
  );
}
