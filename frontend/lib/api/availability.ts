import { apiClient } from "@/lib/api/client";

/** Single availability slot from API (recurring weekly). */
export interface AvailabilitySlot {
  id: string;
  employeeId: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTimeMinutes: number;
  endTimeMinutes: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListAvailabilityResponse {
  success: true;
  message: string;
  availabilities: AvailabilitySlot[];
}

export async function listAvailabilityByEmployee(
  employeeId: string
): Promise<ListAvailabilityResponse> {
  const { data } = await apiClient.get<ListAvailabilityResponse>(
    "/api/availability",
    { params: { employeeId } }
  );
  return data;
}

export interface CreateAvailabilityBody {
  employeeId: string;
  dayOfWeek: number;
  startTimeMinutes: number;
  endTimeMinutes: number;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

export interface CreateAvailabilityResponse {
  success: true;
  message: string;
  availability: AvailabilitySlot;
}

export async function createAvailability(
  body: CreateAvailabilityBody
): Promise<CreateAvailabilityResponse> {
  const { data } = await apiClient.post<CreateAvailabilityResponse>(
    "/api/availability/create",
    body
  );
  return data;
}

export interface UpdateAvailabilityBody {
  id: string;
  dayOfWeek?: number;
  startTimeMinutes?: number;
  endTimeMinutes?: number;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

export interface UpdateAvailabilityResponse {
  success: true;
  message: string;
  availability: AvailabilitySlot;
}

export async function updateAvailability(
  body: UpdateAvailabilityBody
): Promise<UpdateAvailabilityResponse> {
  const { data } = await apiClient.put<UpdateAvailabilityResponse>(
    "/api/availability/update",
    body
  );
  return data;
}

export interface DeleteAvailabilityResponse {
  success: true;
  message: string;
}

export async function deleteAvailability(
  id: string
): Promise<DeleteAvailabilityResponse> {
  const { data } = await apiClient.delete<DeleteAvailabilityResponse>(
    "/api/availability/delete",
    { data: { id } }
  );
  return data;
}

/** Employee shape returned by available-for-window (matches company employee list). */
export interface EmployeeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface AvailableTechnicianListItem {
  id: string;
  userId: string;
  companyId: string;
  roleSlug: string;
  user: EmployeeUser;
  /** True when weekly availability fully covers the requested date/time window. */
  coversWindow?: boolean;
}

export interface AvailableForWindowResponse {
  success: true;
  message: string;
  employees: AvailableTechnicianListItem[];
}

export interface AvailableForWindowParams {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  q?: string;
}

/**
 * Get schedulable employees (technician + admin) for the date/time window.
 * Each employee includes coversWindow when their weekly availability fully covers the window.
 */
export async function getAvailableTechniciansForWindow(
  params: AvailableForWindowParams
): Promise<AvailableForWindowResponse> {
  const { data } = await apiClient.get<AvailableForWindowResponse>(
    "/api/availability/available-for-window",
    {
      params: {
        startDate: params.startDate,
        endDate: params.endDate,
        startTime: params.startTime,
        endTime: params.endTime,
        ...(params.q != null && params.q.trim() !== "" && { q: params.q.trim() }),
      },
    }
  );
  return data;
}
