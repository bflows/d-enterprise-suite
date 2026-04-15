"use client";

import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/app/store";
import {
  selectCurrentCompanyId,
  selectHasAnyRole,
  selectHasRole,
  selectUser,
} from "@/features/auth/authSlice";
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
import { createJobInvoice } from "@/lib/api/invoices";
import JobPaymentModal from "@/components/jobs/JobPaymentModal";
import { parseJobSlug } from "@/lib/utils/slug";
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
import JobActivity from "@/components/jobs/JobActivity";
import { useJobNavbarActions } from "@/components/layout/JobNavbarActionsContext";

export default function JobDetailPage() {
  const dispatch = useDispatch<AppDispatch>();
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const companyId = useSelector((state: RootState) => selectCurrentCompanyId(state));
  const user = useSelector(selectUser);
  const isTechnician = useSelector((state: RootState) =>
    selectHasRole(state, ROLE_SLUGS.TECHNICIAN)
  );
  const canCreateInvoice = useSelector((state: RootState) =>
    selectHasAnyRole(state, [ROLE_SLUGS.ADMIN, ROLE_SLUGS.DISPATCHER, ROLE_SLUGS.TECHNICIAN])
  );
  const { setJobInvoiceDisabled, setJobPaymentDisabled } = useJobNavbarActions();
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
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [activityRefreshSignal, setActivityRefreshSignal] = useState(0);
  const activityRefreshTimeoutRef = useRef<number | null>(null);
  /** Only false after unmount — not when `searchParams` changes (avoids stale "cancelled" after `router.replace`). */
  const isMountedRef = useRef(true);

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

  useEffect(() => {
    if (searchParams.get("action") !== "updateJob" || !job) return;
    setEditModalOpen(true);
    setSaveError(null);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("action");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [searchParams, job, router, pathname]);

  useEffect(() => {
    if (searchParams.get("action") !== "removeJob" || !job) return;
    setEditModalOpen(false);
    setDeleteConfirmOpen(true);
    setDeleteError(null);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("action");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [searchParams, job, router, pathname]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (activityRefreshTimeoutRef.current != null) {
        window.clearTimeout(activityRefreshTimeoutRef.current);
      }
    };
  }, []);

  const triggerActivityRefresh = useCallback(() => {
    setActivityRefreshSignal((value) => value + 1);

    if (activityRefreshTimeoutRef.current != null) {
      window.clearTimeout(activityRefreshTimeoutRef.current);
    }
    activityRefreshTimeoutRef.current = window.setTimeout(() => {
      setActivityRefreshSignal((value) => value + 1);
    }, 500);
  }, []);

  useEffect(() => {
    if (searchParams.get("action") !== "sendInvoice" || !job || !companyId) return;

    const next = new URLSearchParams(searchParams.toString());
    next.delete("action");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });

    if (!job.customerId) {
      setInvoiceError("This job has no customer; cannot create an invoice.");
      return;
    }

    if (!canCreateInvoice) {
      setInvoiceError("Only admins, dispatchers, and technicians can create invoices.");
      return;
    }

    if (!job.customerEmail?.trim()) {
      setInvoiceError("Add a customer email on this job before sending an invoice (Stripe emails the hosted invoice).");
      return;
    }

    const resolvedCustomerId = job.customerId;
    const resolvedCompanyId = companyId;

    setInvoiceLoading(true);
    setInvoiceError(null);

    void (async () => {
      try {
        await createJobInvoice({
          jobId: job.id,
          customerId: resolvedCustomerId,
          companyId: resolvedCompanyId,
        });
        const refreshed = await getJobById(job.id);
        if (!isMountedRef.current) return;
        if (refreshed) {
          setJob(refreshed);
        }
        triggerActivityRefresh();
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "response" in err
            ? String((err as { response?: { data?: { message?: string } } }).response?.data?.message)
            : "Could not create invoice.";
        if (isMountedRef.current) {
          setInvoiceError(message ?? "Could not create invoice.");
        }
      } finally {
        // Always clear loading (searchParams/effect cleanup must not leave spinner stuck; Strict Mode safe).
        setInvoiceLoading(false);
      }
    })();
  }, [
    searchParams,
    job,
    companyId,
    canCreateInvoice,
    router,
    pathname,
    triggerActivityRefresh,
  ]);

  useEffect(() => {
    if (searchParams.get("action") !== "requestPayment" || !job) return;

    const next = new URLSearchParams(searchParams.toString());
    next.delete("action");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });

    if (!canCreateInvoice) {
      return;
    }
    setPaymentModalOpen(true);
  }, [searchParams, job, canCreateInvoice, router, pathname]);

  useEffect(() => {
    if (!job) {
      setJobInvoiceDisabled(true);
      setJobPaymentDisabled(true);
      return;
    }
    const disabled = !canCreateInvoice;
    setJobInvoiceDisabled(disabled);

    const paidOrClosed =
      job.status === "paid" ||
      job.status === "void" ||
      job.status === "uncollectible" ||
      job.status === "cancelled";
    const paymentDisabled =
      disabled || paidOrClosed || !job.stripeInvoiceId;
    setJobPaymentDisabled(paymentDisabled);
  }, [job, canCreateInvoice, setJobInvoiceDisabled, setJobPaymentDisabled]);

  useEffect(() => {
    return () => {
      setJobInvoiceDisabled(true);
      setJobPaymentDisabled(true);
    };
  }, [setJobInvoiceDisabled, setJobPaymentDisabled]);

  const handleSave = useCallback(
    async (updated: Job) => {
      setSaveError(null);
      setSaveLoading(true);
      try {
        const res = await updateJob(updated.id, {
          title: updated.title ?? null,
          startDate: updated.date,
          endDate: updated.endDate ?? updated.date,
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
      if (!job || !companyId || !user?.id) return;
      setProgressError(null);
      setProgressLoading(true);
      try {
        const res = await updateJobStatus(job.id, apiStatus, companyId, user.id);
        setJob(mapApiJobToJob(res.job));
        triggerActivityRefresh();
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
    [companyId, job, triggerActivityRefresh, user?.id]
  );

  if (loading) {
    return (
      <div className="flex items-center gap-x-3 rounded-lg border border-neutral-300 bg-neutral-50 px-4 py-4">
        <div
          className="inline-block size-6 animate-spin rounded-full border-2 border-primary border-r-transparent"
          aria-hidden
        />
        <p className="text-neutral-800 text-p">Loading job...</p>
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
      <h1 className="text-h4 font-bold font-neutral-900">
        {job.title}
      </h1>

      {invoiceLoading && (
        <p className="mt-2 flex items-center gap-2 text-p text-neutral-600" aria-live="polite">
          <span
            className="inline-block size-4 animate-spin rounded-full border-2 border-primary border-r-transparent"
            aria-hidden
          />
          Creating invoice…
        </p>
      )}
      {invoiceError && (
        <p
          className="mt-2 text-sm text-red-600 bg-red-50 py-2 px-3 rounded-lg"
          role="alert"
        >
          {invoiceError}
        </p>
      )}

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
      <JobActivity
        companyId={companyId ?? undefined}
        jobId={job.id}
        refreshSignal={activityRefreshSignal}
      />

      {/* <div className="rounded-lg border border-neutral-300 bg-neutral-50 p-4">
        <h1 className="text-h5 font-bold text-neutral-900 mb-6">
          {job.title?.trim() || job.customerName || "Job Details"}
        </h1>
        <JobDetailView job={job} />
      </div> */}

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

      {companyId ? (
        <JobPaymentModal
          job={job}
          companyId={companyId}
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          onCompleted={async () => {
            const refreshed = await getJobById(job.id);
            if (refreshed) setJob(refreshed);
            triggerActivityRefresh();
          }}
        />
      ) : null}

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
