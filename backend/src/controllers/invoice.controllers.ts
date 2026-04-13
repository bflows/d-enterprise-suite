import type { Request, Response } from "express";
import type Stripe from "stripe";
import type { JobActivityType } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";
import { getDefaultInvoiceCurrency, getInvoiceDaysUntilDue, getStripe } from "../lib/stripe";

interface JobInvoiceBody {
  jobId: string;
  customerId: string;
  companyId: string;
}

function displayCustomerName(firstName: string, lastName: string, companyName: string | null): string {
  const person = `${firstName} ${lastName}`.trim();
  if (companyName?.trim()) {
    return `${companyName.trim()} (${person})`;
  }
  return person || "Customer";
}

async function ensureStripeCustomer(
  stripe: Stripe,
  customer: {
    id: string;
    companyId: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string;
    companyName: string | null;
    stripeCustomerId: string | null;
  }
): Promise<string> {
  if (customer.stripeCustomerId) {
    return customer.stripeCustomerId;
  }

  const params: Stripe.CustomerCreateParams = {
    name: displayCustomerName(customer.firstName, customer.lastName, customer.companyName),
    metadata: {
      internalCustomerId: customer.id,
      companyId: customer.companyId,
    },
  };
  const email = customer.email?.trim();
  if (email) {
    params.email = email;
  }
  const phone = customer.phone?.trim();
  if (phone) {
    params.phone = phone;
  }

  const created = await stripe.customers.create(params, {
    idempotencyKey: `customer-${customer.id}`,
  });

  await prisma.customer.update({
    where: { id: customer.id },
    data: { stripeCustomerId: created.id },
  });

  return created.id;
}

/** `price` is per-unit integer USD cents (ServiceItem.price); Stripe invoice line total in cents. */
function lineAmountCents(price: number, quantity: number): number {
  return Math.round(price * quantity);
}

/** Stripe invoice lines only expose one description string; include catalog copy when present. */
function serviceItemInvoiceDescription(title: string, serviceDescription: string): string {
  const t = title.trim();
  const d = serviceDescription.trim();
  if (!d) return t || "Line item";
  if (!t) return d;
  return `${t} - ${d}`;
}

function serializeInvoice(inv: Stripe.Invoice) {
  return {
    id: inv.id,
    status: inv.status,
    currency: inv.currency,
    amountDue: inv.amount_due,
    amountPaid: inv.amount_paid,
    total: inv.total,
    hostedInvoiceUrl: inv.hosted_invoice_url,
    invoicePdf: inv.invoice_pdf,
    number: inv.number,
    customerEmail: inv.customer_email,
  };
}

/**
 * POST body: jobId, customerId, companyId — creates a single finalized Stripe invoice for the job
 * (line items from attached services). Idempotent if the job already has stripeInvoiceId.
 */
export const createJobInvoice = async (
  req: Request<{}, {}, JobInvoiceBody>,
  res: Response
): Promise<void> => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      res.status(503).json({
        success: false,
        message: "Stripe is not configured (STRIPE_SECRET_KEY).",
      });
      return;
    }

    const companyId = req.business?.id;
    if (!companyId) {
      res.status(400).json({
        success: false,
        message: "Company context is required.",
      });
      return;
    }

    const { jobId, customerId, companyId: companyIdBody } = req.body;
    if (!jobId || !customerId || !companyIdBody) {
      res.status(400).json({
        success: false,
        message: "jobId, customerId, and companyId are required.",
      });
      return;
    }

    if (companyIdBody !== companyId) {
      res.status(403).json({
        success: false,
        message: "companyId must match the signed-in company.",
      });
      return;
    }

    const job = await prisma.job.findFirst({
      where: { id: jobId, companyId, customerId },
      include: {
        customer: true,
        services: true,
        company: { select: { name: true } },
      },
    });

    if (!job) {
      res.status(404).json({
        success: false,
        message: "Job not found for this company and customer.",
      });
      return;
    }

    if (job.status === "CANCELLED") {
      res.status(400).json({
        success: false,
        message: "Cannot invoice a cancelled job.",
      });
      return;
    }

    if (job.stripeInvoiceId) {
      const existing = await stripe.invoices.retrieve(job.stripeInvoiceId);
      res.status(200).json({
        success: true,
        message: "Invoice already exists for this job.",
        invoice: serializeInvoice(existing),
        jobId: job.id,
      });
      return;
    }

    if (!job.services.length) {
      res.status(400).json({
        success: false,
        message: "Job has no services attached; add line items before invoicing.",
      });
      return;
    }

    let totalCents = 0;
    for (const s of job.services) {
      totalCents += lineAmountCents(s.price, s.quantity);
    }
    if (totalCents <= 0) {
      res.status(400).json({
        success: false,
        message: "Invoice total must be greater than zero.",
      });
      return;
    }

    const customerEmail = job.customer.email?.trim();
    if (!customerEmail) {
      res.status(400).json({
        success: false,
        message: "Customer email is required so Stripe can email the invoice.",
      });
      return;
    }

    const currency = getDefaultInvoiceCurrency();
    const daysUntilDue = getInvoiceDaysUntilDue();

    const stripeCustomerId = await ensureStripeCustomer(stripe, job.customer);
    await stripe.customers.update(stripeCustomerId, { email: customerEmail });

    const draft = await stripe.invoices.create(
      {
        customer: stripeCustomerId,
        collection_method: "send_invoice",
        days_until_due: daysUntilDue,
        currency,
        auto_advance: false,
        metadata: {
          jobId: job.id,
          companyId: job.companyId,
          customerId: job.customerId,
        },
        description: job.title
          ? `Job: ${job.title} (${job.company.name})`
          : `Job ${job.id} (${job.company.name})`,
      },
      { idempotencyKey: `invoice-draft-${job.id}` }
    );

    for (const s of job.services) {
      const amount = lineAmountCents(s.price, s.quantity);
      if (amount <= 0) continue;
      await stripe.invoiceItems.create(
        {
          customer: stripeCustomerId,
          invoice: draft.id,
          amount,
          currency,
          description: serviceItemInvoiceDescription(s.title, s.description),
        },
        { idempotencyKey: `invoice-item-${draft.id}-${s.id}` }
      );
    }

    const finalized = await stripe.invoices.finalizeInvoice(
      draft.id,
      {},
      { idempotencyKey: `invoice-finalize-${job.id}` }
    );

    let sent: Stripe.Invoice;
    try {
      sent = await stripe.invoices.sendInvoice(
        finalized.id,
        {},
        { idempotencyKey: `invoice-send-${job.id}` }
      );
    } catch (sendErr) {
      await stripe.invoices.voidInvoice(finalized.id).catch((voidErr) => {
        console.error("Void invoice after failed send:", voidErr);
      });
      throw sendErr;
    }

    const invoiceLabel = sent.number?.trim() || sent.id;
    const actorUserId = req.user?.id ?? null;

    await prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id: job.id },
        data: {
          stripeInvoiceId: sent.id,
          status: "INVOICED",
        },
      });

      await tx.jobActivity.create({
        data: {
          jobId: job.id,
          companyId,
          type: "JOB_INVOICE_SENT" as JobActivityType,
          logName: `Invoice #${invoiceLabel} sent`,
          userId: actorUserId,
        },
      });
    });

    res.status(201).json({
      success: true,
      message: "Invoice created and emailed to the customer (Stripe hosted invoice).",
      invoice: serializeInvoice(sent),
      jobId: job.id,
    });
  } catch (error) {
    console.error("Create job invoice error:", error);
    if (error && typeof error === "object" && "type" in error && "message" in error) {
      const err = error as { type?: string; message?: string };
      res.status(502).json({
        success: false,
        message: err.message ?? "Stripe request failed.",
        stripeType: err.type,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

/**
 * GET query: jobId, customerId, companyId — returns the Stripe invoice for the job if present.
 */
export const getJobInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      res.status(503).json({
        success: false,
        message: "Stripe is not configured (STRIPE_SECRET_KEY).",
      });
      return;
    }

    const companyId = req.business?.id;
    if (!companyId) {
      res.status(400).json({
        success: false,
        message: "Company context is required.",
      });
      return;
    }

    const jobId = typeof req.query.jobId === "string" ? req.query.jobId.trim() : "";
    const customerId = typeof req.query.customerId === "string" ? req.query.customerId.trim() : "";
    const companyIdQuery = typeof req.query.companyId === "string" ? req.query.companyId.trim() : "";

    if (!jobId || !customerId || !companyIdQuery) {
      res.status(400).json({
        success: false,
        message: "jobId, customerId, and companyId query parameters are required.",
      });
      return;
    }

    if (companyIdQuery !== companyId) {
      res.status(403).json({
        success: false,
        message: "companyId must match the signed-in company.",
      });
      return;
    }

    const job = await prisma.job.findFirst({
      where: { id: jobId, companyId, customerId },
      select: { id: true, stripeInvoiceId: true },
    });

    if (!job) {
      res.status(404).json({
        success: false,
        message: "Job not found for this company and customer.",
      });
      return;
    }

    if (!job.stripeInvoiceId) {
      res.status(404).json({
        success: false,
        message: "No Stripe invoice has been created for this job yet.",
      });
      return;
    }

    const inv = await stripe.invoices.retrieve(job.stripeInvoiceId);
    res.status(200).json({
      success: true,
      invoice: serializeInvoice(inv),
      jobId: job.id,
    });
  } catch (error) {
    console.error("Get job invoice error:", error);
    if (error && typeof error === "object" && "type" in error && "message" in error) {
      const err = error as { type?: string; message?: string };
      res.status(502).json({
        success: false,
        message: err.message ?? "Stripe request failed.",
        stripeType: err.type,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};
