import { apiClient } from "@/lib/api/client";

export interface ServiceBookCategoryItem {
  id: string;
  serviceBookId: string;
  name: string;
  sortOrder: number | null;
}

export interface ServiceBookItem {
  id: string;
  companyId: string;
  name: string | null;
  createdAt: string;
  catories?: ServiceBookCategoryItem[];
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

export interface UpdateServiceBookResponse {
  success: true;
  message: string;
  serviceBook?: { id: string; companyId: string; name: string; createdAt: string };
}

/** PUT to update a service book (pricebook). */
export async function updateServiceBook(
  companyId: string,
  name: string,
  serviceBookId: string
): Promise<UpdateServiceBookResponse> {
  const { data } = await apiClient.put<UpdateServiceBookResponse>(
    "/api/service/update-pricebook",
    { id: serviceBookId, companyId, name: name.trim() }
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

export interface UpdateCategoryResponse {
  success: true;
  message: string;
  category?: { id: string; serviceBookId: string; name: string };
}

export async function updateCategory(
  categoryId: string,
  name: string
): Promise<UpdateCategoryResponse> {
  const { data } = await apiClient.put<UpdateCategoryResponse>(
    "/api/service/update-category",
    { categoryId, name: name.trim() }
  );
  return data;
}

export interface DeleteCategoryResponse {
  success: true;
  message: string;
}

export async function deleteCategory(
  categoryId: string
): Promise<DeleteCategoryResponse> {
  const { data } = await apiClient.delete<DeleteCategoryResponse>(
    "/api/service/delete-category",
    { params: { categoryId } }
  );
  return data;
}

export type ServiceItemType = "SERVICE" | "ADDON";

export interface CreateServiceItemPayload {
  companyId: string;
  categoryId: string;
  type: ServiceItemType;
  title: string;
  description: string;
  price: number;
  duration: number;
  unit: number;
}

export interface CreateServiceItemResponse {
  success: true;
  message: string;
  serviceItem: {
    id: string;
    categoryId: string;
    type: ServiceItemType;
    title: string;
    description: string;
    price: number;
    duration: number;
    unit: number;
  };
}

export async function createServiceItem(
  payload: CreateServiceItemPayload
): Promise<CreateServiceItemResponse> {
  const { data } = await apiClient.post<CreateServiceItemResponse>(
    "/api/service/create-service-item",
    payload
  );
  return data;
}

export interface ServiceItemListItem {
  id: string;
  categoryId: string;
  type: ServiceItemType;
  title: string;
  description: string;
  price: number;
  duration: number;
  unit: number;
  sortOrder: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetServiceItemsByCategoryResponse {
  success: true;
  message: string;
  serviceItems: ServiceItemListItem[];
}

export async function getServiceItemsByCategory(
  categoryId: string
): Promise<GetServiceItemsByCategoryResponse> {
  const { data } = await apiClient.get<GetServiceItemsByCategoryResponse>(
    "/api/service/service-items",
    { params: { categoryId } }
  );
  return data;
}

export interface UpdateServiceItemPayload {
  id: string;
  type: ServiceItemType;
  title: string;
  description: string;
  price: number;
  duration: number;
  unit: number;
}

export interface UpdateServiceItemResponse {
  success: true;
  message: string;
  serviceItem: ServiceItemListItem;
}

export async function updateServiceItem(
  payload: UpdateServiceItemPayload
): Promise<UpdateServiceItemResponse> {
  const { data } = await apiClient.put<UpdateServiceItemResponse>(
    "/api/service/update-service-item",
    payload
  );
  return data;
}

export interface DeleteServiceItemResponse {
  success: true;
  message: string;
}

export async function deleteServiceItem(
  serviceItemId: string
): Promise<DeleteServiceItemResponse> {
  const { data } = await apiClient.delete<DeleteServiceItemResponse>(
    "/api/service/delete-service-item",
    { params: { serviceItemId } }
  );
  return data;
}
