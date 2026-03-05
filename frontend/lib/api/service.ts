import { apiClient } from "@/lib/api/client";

export interface ServiceBookItem {
  id: string;
  companyId: string;
  name: string | null;
  createdAt: string;
}

export interface GetServiceBooksResponse {
  success: true;
  message: string;
  serviceBooks: ServiceBookItem[];
}

export async function getServiceBooks(
  companyId: string
): Promise<GetServiceBooksResponse> {
  const { data } = await apiClient.post<GetServiceBooksResponse>(
    "/api/service/service-books",
    { companyId }
  );
  return data;
}

export interface CreateServiceBookResponse {
  success: true;
  message: string;
  serviceBook: { id: string; companyId: string; name: string; createdAt: string };
}

export async function createServiceBook(
  companyId: string,
  name: string
): Promise<CreateServiceBookResponse> {
  const { data } = await apiClient.post<CreateServiceBookResponse>(
    "/api/service/create-service-book",
    { companyId, name: name.trim() }
  );
  return data;
}

export interface CreateCategoryResponse {
  success: true;
  message: string;
  category: { id: string; serviceBookId: string; name: string };
}

export async function createCategory(
  companyId: string,
  serviceBookId: string,
  name: string
): Promise<CreateCategoryResponse> {
  const { data } = await apiClient.post<CreateCategoryResponse>(
    "/api/service/create-category",
    { companyId, serviceBookId, name: name.trim() }
  );
  return data;
}
