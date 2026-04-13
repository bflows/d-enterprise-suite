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
