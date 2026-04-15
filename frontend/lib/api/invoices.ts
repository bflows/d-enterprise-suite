import { apiClient } from "@/lib/api/client";

export interface CreateJobInvoiceBody {
  jobId: string;
  customerId: string;
  companyId: string;
}

export interface StripeInvoiceSummary {
  id: string;
  status: string | null;
  currency: string | null;
  amountDue: number | null;
  amountPaid: number | null;
  total: number | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  number: string | null;
  customerEmail: string | null;
}

export interface CreateJobInvoiceResponse {
  success: true;
  message: string;
  invoice: StripeInvoiceSummary;
  jobId: string;
}

export async function createJobInvoice(
  body: CreateJobInvoiceBody
): Promise<CreateJobInvoiceResponse> {
  const { data } = await apiClient.post<CreateJobInvoiceResponse>(
    "/api/invoices/create",
    body
  );
  return data;
}

export interface GetJobInvoiceResponse {
  success: true;
  invoice: StripeInvoiceSummary;
  jobId: string;
}

/** Loads the Stripe invoice for the job, or null if none / error. */
export async function fetchJobInvoiceSummary(
  params: CreateJobInvoiceBody
): Promise<StripeInvoiceSummary | null> {
  try {
    const { data } = await apiClient.get<GetJobInvoiceResponse>("/api/invoices/job", {
      params: {
        jobId: params.jobId,
        customerId: params.customerId,
        companyId: params.companyId,
      },
    });
    return data.invoice;
  } catch {
    return null;
  }
}

export interface InvoiceStripeConfigResponse {
  success: true;
  publishableKey: string | null;
}

export async function getInvoiceStripeConfig(): Promise<InvoiceStripeConfigResponse> {
  const { data } = await apiClient.get<InvoiceStripeConfigResponse>(
    "/api/invoices/stripe-config"
  );
  return data;
}

export interface MarkPaidBody extends CreateJobInvoiceBody {
  method: "cash" | "check";
  note?: string;
}

export interface MarkPaidResponse {
  success: true;
  message: string;
  invoice: StripeInvoiceSummary;
  jobId: string;
}

export async function markJobInvoicePaidOutOfBand(
  body: MarkPaidBody
): Promise<MarkPaidResponse> {
  const { data } = await apiClient.post<MarkPaidResponse>(
    "/api/invoices/job/mark-paid",
    body
  );
  return data;
}

export interface PayWithCardBody extends CreateJobInvoiceBody {
  paymentMethodId: string;
}

export async function payJobInvoiceWithCard(body: PayWithCardBody): Promise<MarkPaidResponse> {
  const { data } = await apiClient.post<MarkPaidResponse>(
    "/api/invoices/job/pay-card",
    body
  );
  return data;
}
