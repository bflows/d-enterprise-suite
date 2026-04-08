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
  city: string | null;
  zipCode: string | null;
  notes: string | null;
}

export interface GetCustomersResponse {
  success: true;
  message: string;
  customers: CustomerListItem[];
}

export interface SearchCustomersResponse {
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

export async function searchCustomers(
  companyId: string,
  q: string
): Promise<SearchCustomersResponse> {
  const { data } = await apiClient.get<SearchCustomersResponse>(
    "/api/customer/search",
    { params: { companyId, q: q.trim() } }
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
  city?: string;
  zipCode?: string;
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

/** Body for updating a customer. companyId and id required; only provided fields are updated. */
export interface UpdateCustomerBody {
  companyId: string;
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  email?: string | null;
  leadSource?: string | null;
  address2?: string | null;
  city?: string | null;
  zipCode?: string | null;
  companyName?: string | null;
  notes?: string | null;
}

export interface UpdateCustomerResponse {
  success: true;
  message: string;
  customer: CustomerListItem;
}

export async function updateCustomer(
  body: UpdateCustomerBody
): Promise<UpdateCustomerResponse> {
  const { data } = await apiClient.put<UpdateCustomerResponse>(
    "/api/customer/update",
    body
  );
  return data;
}

export interface DeleteCustomerResponse {
  success: true;
  message: string;
}

export async function deleteCustomer(
  id: string,
  companyId: string
): Promise<DeleteCustomerResponse> {
  const { data } = await apiClient.delete<DeleteCustomerResponse>(
    "/api/customer/delete",
    { data: { id, companyId } }
  );
  return data;
}
