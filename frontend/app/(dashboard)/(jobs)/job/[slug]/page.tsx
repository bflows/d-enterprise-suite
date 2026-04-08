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
import type { Job, JobStatus } from "@/lib/calendar/types";
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
import JobStreetView from "@/components/schedule/JobStreetView";
import JobDetailModal from "@/components/schedule/JobDetailModal";
import { formatJobAddress } from "@/lib/formatJobAddress";
import Modal from "@/components/ui/Modal";
import { LuArrowLeft, LuPencil, LuTrash2 } from "react-icons/lu";
import {
  HiChatBubbleLeftRight,
  HiCheckCircle,
  HiPaperAirplane,
  HiPhone,
  HiPlayCircle,
  HiPresentationChartLine,
  HiUser,
} from "react-icons/hi2";
import { ROLE_SLUGS } from "@/types/auth";
import { HiLocationMarker } from "react-icons/hi";

function phoneDigitsForLinks(phone: string): string {
  return phone.replace(/\D/g, "");
}

function progressStatusLabel(status: JobStatus): string {
  const labels: Record<JobStatus, string> = {
    scheduled: "Scheduled",
    en_route: "En route",
    in_progress: "On site",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[status] ?? status;
}

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

  const terminalProgress =
    job.status === "completed" || job.status === "cancelled";
  const enrouteEnabled =
    isTechnician &&
    technicianClockedIn &&
    job.status === "scheduled" &&
    !terminalProgress &&
    !progressLoading;
  const startEnabled =
    isTechnician &&
    job.status === "en_route" &&
    !terminalProgress &&
    !progressLoading;
  const finishEnabled =
    isTechnician &&
    job.status === "in_progress" &&
    !terminalProgress &&
    !progressLoading;

  const progressBtnClass = (enabled: boolean) =>
    `inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-p font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${enabled
      ? "cursor-pointer bg-primary text-neutral-200 hover:bg-primary/90 focus:ring-primary"
      : "cursor-not-allowed bg-neutral-200 text-neutral-500 focus:ring-neutral-300"
    }`;

  const customerNameDisplay =
    [job.customerFirstName, job.customerLastName].filter(Boolean).join(" ").trim() ||
    job.customerName ||
    "—";
  const customerPhoneDigits = job.customerPhone
    ? phoneDigitsForLinks(job.customerPhone)
    : "";
  const jobAddressLine = formatJobAddress(job);
  const contactLinkClass =
    "rounded-full bg-neutral-50 p-2 transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
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

      {/* Progress section */}
      <div className="rounded-lg p-4 border border-neutral-300 bg-neutral-50">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-neutral-900">
            <HiPresentationChartLine className="size-6 shrink-0 text-primary" aria-hidden />
            <h2 className="text-h6 font-bold">Progress</h2>
          </div>
          <p className="text-small py-1 px-3 rounded-full bg-neutral-100 text-neutral-800">
            {progressStatusLabel(job.status)}
          </p>
        </div>
        {progressError && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {progressError}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!enrouteEnabled}
            className={progressBtnClass(enrouteEnabled)}
            onClick={() => void handleProgressStatus("EN_ROUTE")}
          >
            <HiPaperAirplane className="size-5 shrink-0" aria-hidden />
            {progressLoading && job.status === "scheduled" ? "Updating…" : "Enroute"}
          </button>
          <button
            type="button"
            disabled={!startEnabled}
            className={progressBtnClass(startEnabled)}
            onClick={() => void handleProgressStatus("ON_SITE")}
          >
            <HiPlayCircle className="size-5 shrink-0" aria-hidden />
            {progressLoading && job.status === "en_route" ? "Updating…" : "Start Job"}
          </button>
          <button
            type="button"
            disabled={!finishEnabled}
            className={progressBtnClass(finishEnabled)}
            onClick={() => void handleProgressStatus("COMPLETED")}
          >
            <HiCheckCircle className="size-5 shrink-0" aria-hidden />
            {progressLoading && job.status === "in_progress" ? "Updating…" : "Finish Job"}
          </button>
        </div>
        {isTechnician && job.status === "scheduled" && !technicianClockedIn && (
          <p className="mt-2 text-small text-neutral-600">
            You must be clocked in to Enroute.
          </p>
        )}
      </div>

      {/* Customer section */}
      <div className="rounded-lg py-5 border border-neutral-300 bg-neutral-50">
        <div className="px-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-neutral-900">
            <HiUser className="size-6 shrink-0 text-primary" aria-hidden />
            <h2 className="text-h6 font-bold md:text-h5">Customer</h2>
          </div>
        </div>
        <div className="mt-4">
          {jobAddressLine ? (
            <JobStreetView
              key={`${job.address ?? ""}|${job.address2 ?? ""}|${job.city ?? ""}|${job.zipCode ?? ""}`}
              labelAddress={jobAddressLine}
              street={job.address}
              address2={job.address2}
              city={job.city}
              zipCode={job.zipCode}
            />
          ) : null}
          <div className="mt-4 px-4 flex items-center justify-between gap-x-2">
            <p className="text-h6 font-bold text-neutral-800">{customerNameDisplay}</p>
            <div>
              {customerPhoneDigits && (
                <div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`sms:${customerPhoneDigits}`}
                      className={`${contactLinkClass} bg-neutral-200/50 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-800`}
                    >
                      <HiChatBubbleLeftRight className="size-6 shrink-0" aria-hidden />
                    </a>
                    <a href={`tel:${customerPhoneDigits}`} className={`${contactLinkClass} bg-primary/90 text-neutral-200 hover:text-neutral-100 hover:bg-primary`}>
                      <HiPhone className="size-6 shrink-0" aria-hidden />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
          {job.address ? (
            <div className="px-4 flex items-start gap-x-2">
              <div>
                <HiLocationMarker className="size-6 text-primary" />
              </div>
              <div>
                <Link href={`https://www.google.com/maps/place/${job.address}`} target="_blank" className="text-p underline transition-colors duration-300 ease-in-out text-neutral-600 hover:text-primary">
                  {job.address}
                </Link>
                <p className="text-small text-neutral-800">
                  {job.city?.trim() ? job.city : "—"}, {job.zipCode?.trim() ? job.zipCode : "—"}
                </p>
              </div>
            </div>
          ) : <p className="text-neutral-500">—</p>}
        </div>
      </div>

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
