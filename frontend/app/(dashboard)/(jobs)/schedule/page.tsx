"use client";

import { useState, useCallback } from "react";
import { LuPlus } from "react-icons/lu";
import type { Job } from "@/lib/calendar/types";
import { MOCK_JOBS } from "@/lib/calendar/mockJobs";
import Calendar from "@/components/schedule/Calendar";

export default function SchedulePage() {
  const [jobs, setJobs] = useState<Job[]>(MOCK_JOBS);

  const handleJobUpdate = useCallback((updated: Job) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === updated.id ? updated : j))
    );
  }, []);

  const handleJobDelete = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-neutral-900 text-h4 font-bold">Schedule</h1>
        <button
          type="button"
          className="bg-primary text-neutral-200 text-p font-bold py-3 px-4 rounded-lg flex items-center gap-x-2 cursor-pointer transition-colors hover:bg-primary/90 hover:text-neutral-50"
        >
          <LuPlus className="size-6" />
          New Job
        </button>
      </div>

      <Calendar
        jobs={jobs}
        onJobUpdate={handleJobUpdate}
        onJobDelete={handleJobDelete}
      />
    </div>
  );
}
