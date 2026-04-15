import type Stripe from "stripe";
import type { InvoiceStatusType, JobActivityType } from "../../generated/prisma/client";
import { prisma } from "./prisma";

function shouldPollStripeInvoiceForInvoiceStatus(status: InvoiceStatusType): boolean {
  return status !== "PAID" && status !== "CANCELLED" && status !== "VOID" && status !== "UNCOLLECTABLE";
}

/**
 * Reconcile invoice rows with Stripe for schedule/dashboard refreshes when webhooks are unavailable.
 * Fire-and-forget parallel retrieves; failures are logged and ignored.
 */
export async function syncJobsInvoiceStatusesFromStripe(
  stripe: Stripe,
  jobs: Array<{
    id: string;
    invoice: { stripeInvoiceId: string | null; status: InvoiceStatusType } | null;
  }>
): Promise<void> {
  const candidates = jobs.filter(
    (j) => j.invoice?.stripeInvoiceId && shouldPollStripeInvoiceForInvoiceStatus(j.invoice.status)
  );
  await Promise.all(
    candidates.map(async (j) => {
      try {
        const inv = await stripe.invoices.retrieve(j.invoice!.stripeInvoiceId!);
        await syncInvoiceFromStripe(inv);
      } catch (e) {
        console.error("Stripe invoice sync (job list):", j.id, e);
      }
    })
  );
}

/**
 * Maps a Stripe Invoice to our `InvoiceStatusType`. Returns null when the invoice state
 * should not drive status (e.g. draft).
 */
export function invoiceStatusFromStripeInvoice(inv: Stripe.Invoice): InvoiceStatusType | null {
  const s = inv.status;
  if (s === "paid") return "PAID";
  if (s === "void") return "VOID";
  if (s === "uncollectible") return "UNCOLLECTABLE";
  if (s === "open") {
    const due = inv.due_date;
    if (due != null && due * 1000 < Date.now()) return "OVERDUE";
    return "INVOICED";
  }
  return null;
}

function formatUsdFromCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function paidAmountCents(inv: Stripe.Invoice): number {
  if (typeof inv.amount_paid === "number") return inv.amount_paid;
  if (typeof inv.total === "number") return inv.total;
  return 0;
}

/** Activity line when an invoice becomes PAID — uses invoice metadata set before `invoices.pay`. */
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
  const cents = paidAmountCents(inv);
  const amount = formatUsdFromCents(cents);
  if (via === "cash") return `Payment: ${amount} (cash)${suffix}`;
  if (via === "check") return `Payment: ${amount} (check)${suffix}`;
  if (via === "card") return `Payment: ${amount} (card)${suffix}`;
  return "Invoice paid (Stripe)";
}

function activityLogNameForInvoiceStatus(status: InvoiceStatusType): string {
  switch (status) {
    case "PAID":
      return "Invoice paid (Stripe)";
    case "VOID":
      return "Invoice voided (Stripe)";
    case "UNCOLLECTABLE":
      return "Invoice marked uncollectible (Stripe)";
    case "OVERDUE":
      return "Invoice overdue (Stripe)";
    case "INVOICED":
      return "Invoice open — awaiting payment (Stripe)";
    case "CANCELLED":
      return "Invoice cancelled";
    default:
      return "Invoice updated from Stripe";
  }
}

/**
 * Finds the invoice linked to this Stripe invoice (`metadata.jobId` or `stripeInvoiceId`).
 */
async function findInvoiceForStripeInvoice(inv: Stripe.Invoice) {
  const metaJobId = inv.metadata?.jobId?.trim();
  if (metaJobId) {
    const byMeta = await prisma.invoice.findFirst({
      where: { jobId: metaJobId, stripeInvoiceId: inv.id },
      select: {
        id: true,
        jobId: true,
        companyId: true,
        status: true,
        stripeInvoiceId: true,
      },
    });
    if (byMeta) return byMeta;
  }
  return prisma.invoice.findFirst({
    where: { stripeInvoiceId: inv.id },
    select: {
      id: true,
      jobId: true,
      companyId: true,
      status: true,
      stripeInvoiceId: true,
    },
  });
}

/**
 * Updates the invoice row when it differs from the derived Stripe invoice status.
 * Appends a job activity on the related job for audit.
 */
export async function syncInvoiceFromStripe(
  inv: Stripe.Invoice
): Promise<{ updated: boolean; invoiceId?: string; status?: InvoiceStatusType }> {
  const nextStatus = invoiceStatusFromStripeInvoice(inv);
  if (!nextStatus) {
    return { updated: false };
  }

  const row = await findInvoiceForStripeInvoice(inv);
  if (!row) {
    return { updated: false };
  }

  if (row.status === nextStatus) {
    return { updated: false, invoiceId: row.id, status: nextStatus };
  }

  const logName =
    nextStatus === "PAID" ? paidActivityLogNameFromInvoice(inv) : activityLogNameForInvoiceStatus(nextStatus);

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: row.id },
      data: { status: nextStatus },
    });
    await tx.jobActivity.create({
      data: {
        jobId: row.jobId,
        companyId: row.companyId,
        type: "JOB_STATUS_UPDATED" as JobActivityType,
        logName,
        userId: null,
      },
    });
  });

  return { updated: true, invoiceId: row.id, status: nextStatus };
}
