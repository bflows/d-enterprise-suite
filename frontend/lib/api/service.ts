import { apiClient } from "@/lib/api/client";

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
