"use client";

import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { isInvoiceTerminalForPayment, type Job } from "@/lib/calendar/types";
import {
  getJobById,
  deleteJob,
  listJobs,
  mapApiJobToJob,
  updateJobStatus,
  type ApiJobStatus,
} from "@/lib/api/jobs";
import { createJobInvoice } from "@/lib/api/invoices";
import JobPaymentModal from "@/components/jobs/JobPaymentModal";
import { parseJobSlug } from "@/lib/utils/slug";
import NewJobModal from "@/components/schedule/NewJobModal";
import Modal from "@/components/ui/Modal";
import { LuArrowLeft } from "react-icons/lu";
import { ROLE_SLUGS, TIME_CARD_CLOCK_ROLE_SLUGS } from "@/types/auth";
import JobProgress from "@/components/jobs/JobProgress";
import JobCustomer from "@/components/jobs/JobCustomer";
import JobSchedule from "@/components/jobs/JobSchedule";
import JobLineItems from "@/components/jobs/JobLineItems";
import JobAttachments from "@/components/jobs/JobAttachments";
import JobNotes from "@/components/jobs/JobNotes";
import JobActivity from "@/components/jobs/JobActivity";
import { useJobNavbarActions } from "@/components/layout/JobNavbarActionsContext";
import { getDashboardPreviousPathname } from "@/components/layout/dashboardNavigationPaths";

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
  const [overlapJobs, setOverlapJobs] = useState<Job[]>([]);
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
    const role = user?.role;
    if (
      companyId &&
      role &&
      (TIME_CARD_CLOCK_ROLE_SLUGS as readonly string[]).includes(role)
    ) {
      void dispatch(fetchActiveTimeCard());
    }
  }, [dispatch, companyId, user?.role]);

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

  const invoicePaidCardFallbackCents = useMemo(() => {
    const services = job?.services;
    if (!services?.length) return undefined;
    return services.reduce((sum, s) => sum + s.price * s.quantity, 0);
  }, [job?.services]);

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
      setInvoiceError(
        "Add a customer email on this job before sending an invoice (Stripe emails the invoice; a text with the payment link is sent when the customer has a phone number)."
      );
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
      job.status === "cancelled" || isInvoiceTerminalForPayment(job.invoice);
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

  useEffect(() => {
    if (!editModalOpen || !companyId) return;
    let cancelled = false;
    listJobs()
      .then((list) => {
        if (!cancelled) setOverlapJobs(list);
      })
      .catch(() => {
        if (!cancelled) setOverlapJobs([]);
      });
    return () => {
      cancelled = true;
    };
  }, [editModalOpen, companyId]);

  const handleJobUpdatedFromModal = useCallback((updated: Job) => {
    setJob(updated);
    setEditModalOpen(false);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!job) return;
    setDeleteLoading(true);
    setDeleteError(null);
    let success = false;
    try {
      await deleteJob(job.id);
      success = true;
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? String((err as { response?: { data?: { message?: string } } }).response?.data?.message)
          : "Failed to delete job.";
      setDeleteError(message ?? "Failed to delete job.");
    } finally {
      setDeleteLoading(false);
    }
    if (!success) return;
    setDeleteConfirmOpen(false);
    setDeleteError(null);
    const prev = getDashboardPreviousPathname();
    const target =
      prev && prev.length > 0 && prev !== pathname ? prev : "/schedule";
    router.replace(target);
  }, [job, router, pathname]);

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
      <div className="flex flex-col items-center justify-center">
        <div className="inline-block size-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
        <p className="text-p font-bold mt-2 text-neutral-600">Loading job...</p>
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
      <div className="flex items-center justify-between gap-x-2">
      <h1 className="text-h4 font-bold font-neutral-900">
        {job.title}
      </h1>

      {invoiceLoading && (
        <p className="flex items-center gap-2" aria-live="polite">
          <span
            className="inline-block size-6 animate-spin rounded-full border-2 border-primary border-r-transparent"
            aria-hidden
            />
        </p>
      )}
      </div>
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
        invoicePaidCardFallbackCents={invoicePaidCardFallbackCents}
      />

      {/* <div className="rounded-lg border border-neutral-300 bg-neutral-50 p-4">
        <h1 className="text-h5 font-bold text-neutral-900 mb-6">
          {job.title?.trim() || job.customerName || "Job Details"}
        </h1>
        <JobDetailView job={job} />
      </div> */}

      <NewJobModal
        key={job.id}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleJobUpdatedFromModal}
        existingJobs={overlapJobs.filter((j) => j.id !== job.id)}
        jobToEdit={editModalOpen ? job : null}
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
