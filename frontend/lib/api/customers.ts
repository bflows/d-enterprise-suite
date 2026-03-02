import { apiClient } from "@/lib/api/client";

export interface CustomerListItem {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  email: string | null;
  leadSource: string | null;
  address2: string | null;
  notes: string | null;
}

export interface GetCustomersResponse {
  success: true;
  message: string;
  customers: CustomerListItem[];
}

export async function getCustomers(
  companyId: string
): Promise<GetCustomersResponse> {
  const { data } = await apiClient.get<GetCustomersResponse>(
    "/api/customer",
    { params: { companyId } }
  );
  return data;
}

/** Body for creating a customer. companyId is required; optional: email, leadSource, address2, notes. */
export interface CreateCustomerBody {
  companyId: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  email?: string;
  leadSource?: string;
  address2?: string;
  notes?: string;
}

export interface CreateCustomerResponse {
  success: true;
  message: string;
  customer: CustomerListItem & { company?: { id: string; name: string } };
}

export async function createCustomer(
  body: CreateCustomerBody
): Promise<CreateCustomerResponse> {
  const { data } = await apiClient.post<CreateCustomerResponse>(
    "/api/customer/create",
    body
  );
  return data;
}
