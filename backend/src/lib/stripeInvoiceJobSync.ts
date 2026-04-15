import type Stripe from "stripe";
import type { JobActivityType, JobStatusType } from "../../generated/prisma/client";
import { prisma } from "./prisma";

/** Jobs already marked paid or cancelled are not polled (saves Stripe calls on list). */
function shouldPollStripeInvoiceForJobStatus(status: JobStatusType): boolean {
  return status !== "CANCELLED" && status !== "PAID";
}

/**
 * Reconcile job rows with Stripe for schedule/dashboard refreshes when webhooks are unavailable.
 * Fire-and-forget parallel retrieves; failures are logged and ignored.
 */
export async function syncJobsInvoiceStatusesFromStripe(
  stripe: Stripe,
  jobs: Array<{ id: string; stripeInvoiceId: string | null; status: JobStatusType }>
): Promise<void> {
  const candidates = jobs.filter(
    (j) => j.stripeInvoiceId && shouldPollStripeInvoiceForJobStatus(j.status)
  );
  await Promise.all(
    candidates.map(async (j) => {
      try {
        const inv = await stripe.invoices.retrieve(j.stripeInvoiceId!);
        await syncJobStatusFromStripeInvoice(inv);
      } catch (e) {
        console.error("Stripe invoice sync (job list):", j.id, e);
      }
    })
  );
}

/**
 * Maps a Stripe Invoice to our job status. Returns null when the invoice state
 * should not drive job status (e.g. draft).
 */
export function jobStatusFromStripeInvoice(inv: Stripe.Invoice): JobStatusType | null {
  const s = inv.status;
  if (s === "paid") return "PAID";
  if (s === "void") return "VOID";
  if (s === "uncollectible") return "UNCOLLECTIBLE";
  if (s === "open") {
    const due = inv.due_date;
    if (due != null && due * 1000 < Date.now()) return "OVERDUE";
    return "INVOICED";
  }
  return null;
}

/** Activity line when a job becomes PAID — uses invoice metadata set before `invoices.pay`. */
function paidActivityLogNameFromInvoice(inv: Stripe.Invoice): string {
  const via = inv.metadata?.paidVia?.trim().toLowerCase();
  const noteRaw = inv.metadata?.paymentNote?.trim();
  const note =
    noteRaw && noteRaw.length > 0
      ? noteRaw.length > 200
        ? `${noteRaw.slice(0, 200)}…`
        : noteRaw
      : "";
  const suffix = note ? ` — ${note}` : "";
  if (via === "cash") return `Invoice marked paid (cash)${suffix}`;
  if (via === "check") return `Invoice marked paid (check)${suffix}`;
  if (via === "card") return `Invoice paid (card)${suffix}`;
  return "Invoice paid (Stripe)";
}

function activityLogNameForStatus(status: JobStatusType): string {
  switch (status) {
    case "PAID":
      return "Invoice paid (Stripe)";
    case "VOID":
      return "Invoice voided (Stripe)";
    case "UNCOLLECTIBLE":
      return "Invoice marked uncollectible (Stripe)";
    case "OVERDUE":
      return "Invoice overdue (Stripe)";
    case "INVOICED":
      return "Invoice open — awaiting payment (Stripe)";
    default:
      return "Job status updated from Stripe invoice";
  }
}

/**
 * Finds the job linked to this Stripe invoice (`metadata.jobId` or `stripeInvoiceId`).
 */
async function findJobForStripeInvoice(inv: Stripe.Invoice) {
  const metaJobId = inv.metadata?.jobId?.trim();
  if (metaJobId) {
    const byMeta = await prisma.job.findFirst({
      where: { id: metaJobId, stripeInvoiceId: inv.id },
      select: {
        id: true,
        companyId: true,
        status: true,
        stripeInvoiceId: true,
      },
    });
    if (byMeta) return byMeta;
  }
  return prisma.job.findFirst({
    where: { stripeInvoiceId: inv.id },
    select: {
      id: true,
      companyId: true,
      status: true,
      stripeInvoiceId: true,
    },
  });
}

/**
 * Updates the job's status when it differs from the derived Stripe invoice status.
 * Skips jobs in `CANCELLED` so local cancellation is not overwritten.
 */
export async function syncJobStatusFromStripeInvoice(
  inv: Stripe.Invoice
): Promise<{ updated: boolean; jobId?: string; status?: JobStatusType }> {
  const nextStatus = jobStatusFromStripeInvoice(inv);
  if (!nextStatus) {
    return { updated: false };
  }

  const job = await findJobForStripeInvoice(inv);
  if (!job) {
    return { updated: false };
  }

  if (job.status === "CANCELLED") {
    return { updated: false, jobId: job.id };
  }

  if (job.status === nextStatus) {
    return { updated: false, jobId: job.id, status: nextStatus };
  }

  const logName =
    nextStatus === "PAID" ? paidActivityLogNameFromInvoice(inv) : activityLogNameForStatus(nextStatus);

  await prisma.$transaction(async (tx) => {
    await tx.job.update({
      where: { id: job.id },
      data: { status: nextStatus },
    });
    await tx.jobActivity.create({
      data: {
        jobId: job.id,
        companyId: job.companyId,
        type: "JOB_STATUS_UPDATED" as JobActivityType,
        logName,
        userId: null,
      },
    });
  });

  return { updated: true, jobId: job.id, status: nextStatus };
}
