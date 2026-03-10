"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { selectCurrentCompanyId } from "@/features/auth/authSlice";
import type { Job } from "@/lib/calendar/types";
import { getJobById, updateJob, deleteJob, mapApiJobToJob } from "@/lib/api/jobs";
import { parseJobSlug } from "@/lib/utils/slug";
import JobDetailView from "@/components/schedule/JobDetailView";
import JobDetailModal from "@/components/schedule/JobDetailModal";
import Modal from "@/components/ui/Modal";
import { LuArrowLeft, LuPencil, LuTrash2 } from "react-icons/lu";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = useSelector((state: RootState) => selectCurrentCompanyId(state));
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

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href="/schedule"
          className="inline-flex items-center gap-2 text-p text-neutral-600 hover:text-neutral-900"
        >
          <LuArrowLeft className="size-4" />
          Back to Schedule
        </Link>
        <p className="text-neutral-600">Loading job…</p>
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/schedule"
          className="inline-flex items-center gap-2 text-p text-neutral-600 hover:text-neutral-900"
        >
          <LuArrowLeft className="size-4" />
          Back to Schedule
        </Link>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      <div className="rounded-lg border border-neutral-300 bg-white p-6">
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
        onEdit={() => {}}
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
