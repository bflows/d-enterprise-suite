"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import type { Job } from "@/lib/calendar/types";
import {
  fetchJobInvoiceSummary,
  getInvoiceStripeConfig,
  markJobInvoicePaidOutOfBand,
  payJobInvoiceWithCard,
  type StripeInvoiceSummary,
} from "@/lib/api/invoices";
import { formatUsdFromCents } from "@/lib/money";
import Modal from "@/components/ui/Modal";
import { HiBanknotes, HiCreditCard, HiDocumentText } from "react-icons/hi2";

type Step = "pick" | "cash" | "check" | "card";

function lineItemsTotalCents(job: Job): number {
  return (job.services ?? []).reduce((acc, s) => acc + s.quantity * s.price, 0);
}

function amountToCollectCents(invoice: StripeInvoiceSummary | null, job: Job): number {
  if (invoice?.status === "open" && invoice.amountDue != null && invoice.amountDue > 0) {
    return invoice.amountDue;
  }
  if (invoice?.total != null && invoice.total > 0) {
    return invoice.total;
  }
  return lineItemsTotalCents(job);
}

const cardElementOptions = {
  style: {
    base: {
      fontSize: "16px",
      color: "#171717",
      "::placeholder": { color: "#737373" },
    },
    invalid: { color: "#dc2626" },
  },
};

interface CardPaySectionProps {
  job: Job;
  companyId: string;
  amountLabel: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}

function CardPaySection({ job, companyId, amountLabel, onSuccess, onError }: CardPaySectionProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  const handlePay = async () => {
    if (!job.customerId) return;
    if (!stripe || !elements) {
      onError("Payment form is still loading.");
      return;
    }
    const card = elements.getElement(CardElement);
    if (!card) {
      onError("Card field not found.");
      return;
    }
    setBusy(true);
    try {
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card,
      });
      if (error) {
        onError(error.message ?? "Could not read card.");
        return;
      }
      if (!paymentMethod?.id) {
        onError("Could not create payment method.");
        return;
      }
      await payJobInvoiceWithCard({
        jobId: job.id,
        customerId: job.customerId,
        companyId,
        paymentMethodId: paymentMethod.id,
      });
      onSuccess();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? String((err as { response?: { data?: { message?: string } } }).response?.data?.message)
          : "Payment failed.";
      onError(message ?? "Payment failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-p text-neutral-700">
        Card details are sent to Stripe only (not stored on our servers). Amount:{" "}
        <span className="font-semibold text-neutral-900">{amountLabel}</span>
      </p>
      <div className="rounded-lg border border-neutral-300 bg-white px-3 py-3">
        <CardElement options={cardElementOptions} />
      </div>
      <button
        type="button"
        onClick={() => void handlePay()}
        disabled={!stripe || busy}
        className="w-full rounded-lg bg-primary px-4 py-3 text-p font-semibold text-neutral-50 transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Processing…" : `Pay ${amountLabel}`}
      </button>
    </div>
  );
}

export interface JobPaymentModalProps {
  job: Job;
  companyId: string;
  isOpen: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

export default function JobPaymentModal({
  job,
  companyId,
  isOpen,
  onClose,
  onCompleted,
}: JobPaymentModalProps) {
  const [step, setStep] = useState<Step>("pick");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoice, setInvoice] = useState<StripeInvoiceSummary | null>(null);
  const [oobLoading, setOobLoading] = useState(false);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [stripeInitError, setStripeInitError] = useState<string | null>(null);

  const lineTotal = useMemo(() => lineItemsTotalCents(job), [job]);
  const collectCents = useMemo(() => amountToCollectCents(invoice, job), [invoice, job]);
  const amountLabel = formatUsdFromCents(collectCents);

  const reset = useCallback(() => {
    setStep("pick");
    setNote("");
    setError(null);
    setInvoice(null);
    setOobLoading(false);
    setStripePromise(null);
    setStripeInitError(null);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      reset();
      return;
    }
    reset();
  }, [isOpen, job.id, reset]);

  useEffect(() => {
    if (!isOpen || !job.customerId) return;
    let cancelled = false;
    setInvoiceLoading(true);
    void fetchJobInvoiceSummary({
      jobId: job.id,
      customerId: job.customerId,
      companyId,
    })
      .then((inv) => {
        if (!cancelled) setInvoice(inv);
      })
      .finally(() => {
        if (!cancelled) setInvoiceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, job.id, job.customerId, companyId]);

  useEffect(() => {
    if (!isOpen || step !== "card") return;
    let cancelled = false;
    setStripeInitError(null);
    setStripePromise(null);
    void (async () => {
      const cfg = await getInvoiceStripeConfig();
      if (cancelled) return;
      if (!cfg.publishableKey) {
        setStripeInitError(
          "Card payments are not configured. Add STRIPE_PUBLISH_KEY to the API server environment."
        );
        return;
      }
      setStripePromise(loadStripe(cfg.publishableKey));
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, step]);

  const handlePaid = useCallback(() => {
    onCompleted();
    onClose();
  }, [onCompleted, onClose]);

  const recordCashOrCheck = async (method: "cash" | "check") => {
    if (!job.customerId) return;
    setError(null);
    setOobLoading(true);
    try {
      await markJobInvoicePaidOutOfBand({
        jobId: job.id,
        customerId: job.customerId,
        companyId,
        method,
        note: note.trim() || undefined,
      });
      handlePaid();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? String((err as { response?: { data?: { message?: string } } }).response?.data?.message)
          : "Could not record payment.";
      setError(message ?? "Could not record payment.");
    } finally {
      setOobLoading(false);
    }
  };

  const canPay =
    !invoiceLoading &&
    Boolean(job.stripeInvoiceId || invoice?.id) &&
    (invoice?.status === "open" || (!invoice && lineTotal > 0));

  const blockingMessage = (() => {
    if (!job.customerId) return "This job has no customer.";
    if (invoiceLoading) return null;
    if (!job.stripeInvoiceId && !invoice?.id) {
      return "Send an invoice for this job before recording payment.";
    }
    if (invoice && invoice.status === "paid") {
      return "This invoice is already paid.";
    }
    if (invoice && invoice.status !== "open") {
      return `This invoice cannot be paid online (status: ${invoice.status ?? "unknown"}).`;
    }
    return null;
  })();

  const title =
    step === "pick"
      ? "Record payment"
      : step === "card"
        ? "Pay with card"
        : step === "cash"
          ? "Cash payment"
          : "Check payment";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      hideCancelButton
      showCloseButton
      closeOnBackdropClick={false}
    >
      <div className="space-y-4">
        {blockingMessage ? (
          <p className="text-p text-red-700 bg-red-50 rounded-lg px-3 py-2" role="alert">
            {blockingMessage}
          </p>
        ) : null}

        {error ? (
          <p className="text-p text-red-700 bg-red-50 rounded-lg px-3 py-2" role="alert">
            {error}
          </p>
        ) : null}

        {step === "pick" && !blockingMessage ? (
          <>
            <p className="text-p text-neutral-700">How was this job paid?</p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                disabled={!canPay || Boolean(blockingMessage)}
                onClick={() => setStep("cash")}
                className="flex items-center gap-3 rounded-lg border border-neutral-300 bg-white px-4 py-4 text-left text-p font-semibold text-neutral-900 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <HiBanknotes className="size-8 shrink-0 text-green-700" aria-hidden />
                Cash
              </button>
              <button
                type="button"
                disabled={!canPay || Boolean(blockingMessage)}
                onClick={() => setStep("card")}
                className="flex items-center gap-3 rounded-lg border border-neutral-300 bg-white px-4 py-4 text-left text-p font-semibold text-neutral-900 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <HiCreditCard className="size-8 shrink-0 text-primary" aria-hidden />
                Card
              </button>
              <button
                type="button"
                disabled={!canPay || Boolean(blockingMessage)}
                onClick={() => setStep("check")}
                className="flex items-center gap-3 rounded-lg border border-neutral-300 bg-white px-4 py-4 text-left text-p font-semibold text-neutral-900 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <HiDocumentText className="size-8 shrink-0 text-neutral-600" aria-hidden />
                Check
              </button>
            </div>
          </>
        ) : null}

        {(step === "cash" || step === "check") && !blockingMessage ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => {
                setStep("pick");
                setError(null);
              }}
              className="text-p text-primary font-medium hover:underline"
            >
              ← Back
            </button>
            <div className="rounded-lg border border-neutral-300 bg-white px-4 py-3">
              <p className="text-small uppercase text-neutral-600">Amount</p>
              <p className="text-h5 font-bold text-neutral-900">{amountLabel}</p>
              {invoice?.status === "open" && lineTotal > 0 && collectCents !== lineTotal ? (
                <p className="mt-2 text-small text-neutral-600">
                  Line items on the job: {formatUsdFromCents(lineTotal)} (invoice amount due may
                  differ)
                </p>
              ) : null}
            </div>
            <label className="block space-y-2">
              <span className="text-p font-medium text-neutral-800">Note (optional)</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-p text-neutral-900 placeholder:text-neutral-500"
                placeholder="Reference, check number, etc."
              />
            </label>
            <button
              type="button"
              disabled={oobLoading || !canPay}
              onClick={() => void recordCashOrCheck(step === "cash" ? "cash" : "check")}
              className="w-full rounded-lg bg-primary px-4 py-3 text-p font-semibold text-neutral-50 transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {oobLoading ? "Saving…" : `Mark paid (${step})`}
            </button>
          </div>
        ) : null}

        {step === "card" && !blockingMessage ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => {
                setStep("pick");
                setError(null);
              }}
              className="text-p text-primary font-medium hover:underline"
            >
              ← Back
            </button>
            {stripeInitError ? (
              <p className="text-p text-red-700 bg-red-50 rounded-lg px-3 py-2" role="alert">
                {stripeInitError}
              </p>
            ) : !stripePromise ? (
              <p className="text-p text-neutral-600">Loading secure card field…</p>
            ) : (
              <Elements stripe={stripePromise}>
                <CardPaySection
                  job={job}
                  companyId={companyId}
                  amountLabel={amountLabel}
                  onSuccess={handlePaid}
                  onError={(msg) => setError(msg)}
                />
              </Elements>
            )}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
