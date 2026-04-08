"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/app/store";
import { selectCurrentCompanyId, selectHasRole } from "@/features/auth/authSlice";
import {
  fetchActiveTimeCard,
  selectIsClockedInTechnician,
} from "@/features/timeCard/timeCardSlice";
import type { Job } from "@/lib/calendar/types";
import {
  getJobById,
  updateJob,
  deleteJob,
  mapApiJobToJob,
  updateJobStatus,
  type ApiJobStatus,
} from "@/lib/api/jobs";
import { parseJobSlug } from "@/lib/utils/slug";
import JobDetailView from "@/components/schedule/JobDetailView";
import JobDetailModal from "@/components/schedule/JobDetailModal";
import Modal from "@/components/ui/Modal";
import { LuArrowLeft } from "react-icons/lu";
import { ROLE_SLUGS } from "@/types/auth";
import JobProgress from "@/components/jobs/JobProgress";
import JobCustomer from "@/components/jobs/JobCustomer";
import JobSchedule from "@/components/jobs/JobSchedule";
import JobLineItems from "@/components/jobs/JobLineItems";
import JobAttachments from "@/components/jobs/JobAttachments";
import JobNotes from "@/components/jobs/JobNotes";

export default function JobDetailPage() {
  const dispatch = useDispatch<AppDispatch>();
  const params = useParams();
  const router = useRouter();
  const companyId = useSelector((state: RootState) => selectCurrentCompanyId(state));
  const isTechnician = useSelector((state: RootState) =>
    selectHasRole(state, ROLE_SLUGS.TECHNICIAN)
  );
  const technicianClockedIn = useSelector(selectIsClockedInTechnician);
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const jobId = parseJobSlug(slug);

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);

  useEffect(() => {
    if (isTechnician) {
      void dispatch(fetchActiveTimeCard());
    }
  }, [dispatch, isTechnician]);

  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      setJob(null);
      setError("Invalid job");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getJobById(jobId)
      .then((j) => {
        if (!cancelled) {
          setJob(j ?? null);
          if (!j) setError("Job not found");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setJob(null);
          setError("Failed to load job");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const handleSave = useCallback(
    async (updated: Job) => {
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
          ...(updated.serviceItemIds !== undefined && { serviceItemIds: updated.serviceItemIds }),
        });
        const mapped = mapApiJobToJob(res.job);
        setJob(mapped);
        setEditModalOpen(false);
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "response" in err
            ? String((err as { response?: { data?: { message?: string } } }).response?.data?.message)
            : "Failed to update job.";
        setSaveError(message ?? "Failed to update job.");
      } finally {
        setSaveLoading(false);
      }
    },
    []
  );

  const handleRequestDelete = useCallback(() => {
    setEditModalOpen(false);
    setDeleteConfirmOpen(true);
    setDeleteError(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!job) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteJob(job.id);
      router.replace("/schedule");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? String((err as { response?: { data?: { message?: string } } }).response?.data?.message)
          : "Failed to delete job.";
      setDeleteError(message ?? "Failed to delete job.");
    } finally {
      setDeleteLoading(false);
    }
  }, [job, router]);

  const handleCloseDeleteConfirm = useCallback(() => {
    if (!deleteLoading) {
      setDeleteConfirmOpen(false);
      setDeleteError(null);
    }
  }, [deleteLoading]);

  const handleProgressStatus = useCallback(
    async (apiStatus: ApiJobStatus) => {
      if (!job) return;
      setProgressError(null);
      setProgressLoading(true);
      try {
        const res = await updateJobStatus(job.id, apiStatus);
        setJob(mapApiJobToJob(res.job));
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "response" in err
            ? String((err as { response?: { data?: { message?: string } } }).response?.data?.message)
            : "Could not update job status.";
        setProgressError(message ?? "Could not update job status.");
      } finally {
        setProgressLoading(false);
      }
    },
    [job]
  );

  if (loading) {
    return (
      <div className="mt-4 flex items-center gap-x-3 rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-4">
        <div
          className="inline-block size-6 animate-spin rounded-full border-2 border-primary border-r-transparent"
          aria-hidden
        />
        <p className="text-neutral-800 text-p">Loading job…</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href="/schedule"
          className="inline-flex items-center gap-2 text-p text-neutral-600 hover:text-neutral-900"
        >
          <LuArrowLeft className="size-4" />
          Back to Schedule
        </Link>
        <p className="text-secondary text-p">{error ?? "Job not found"}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEditModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg cursor-pointer bg-primary px-4 py-2 text-p font-medium text-neutral-200 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <LuPencil className="size-4" />
          Edit
        </button>
        <button
          type="button"
          onClick={() => {
            setDeleteError(null);
            setDeleteConfirmOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg cursor-pointer border border-neutral-400 bg-neutral-50 px-4 py-2 text-p font-medium text-neutral-700 hover:bg-red-50 hover:text-secondary hover:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary"
        >
          <LuTrash2 className="size-4" />
          Delete
        </button>
      </div> */}

      {/* Progress section */}
      <JobProgress
        status={job.status}
        isTechnician={isTechnician}
        technicianClockedIn={technicianClockedIn}
        progressLoading={progressLoading}
        progressError={progressError}
        onUpdateStatus={handleProgressStatus}
      />

      {/* Customer section */}
      <JobCustomer job={job} />
      <JobSchedule job={job} />
      <JobLineItems job={job} />
      <JobAttachments jobId={job.id} />
      <JobNotes jobId={job.id} notes={job.notes} onSaved={(updated) => setJob(updated)} />

      <div className="rounded-lg border border-neutral-300 bg-neutral-50 p-4">
        <h1 className="text-h5 font-bold text-neutral-900 mb-6">
          {job.title?.trim() || job.customerName || "Job Details"}
        </h1>
        <JobDetailView job={job} />
      </div>

      <JobDetailModal
        key={job.id}
        companyId={companyId ?? undefined}
        job={job}
        isOpen={editModalOpen}
        isEditMode
        onClose={() => {
          setEditModalOpen(false);
          setSaveError(null);
        }}
        onEdit={() => { }}
        onSave={handleSave}
        onRequestDelete={handleRequestDelete}
        saveLoading={saveLoading}
        saveError={saveError}
      />

      <Modal
        isOpen={deleteConfirmOpen}
        onClose={handleCloseDeleteConfirm}
        title="Delete job"
        cancelLabel="Cancel"
        primaryAction={{
          label: deleteLoading ? "Deleting…" : "Delete",
          onClick: handleConfirmDelete,
          disabled: deleteLoading,
        }}
      >
        <div className="space-y-3">
          {job && (
            <p className="text-p text-neutral-700">
              Are you sure you want to delete{" "}
              <strong>{job.title?.trim() || job.customerName || "this job"}</strong>? This cannot be
              undone.
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
