import { apiClient } from "@/lib/api/client";

/** User shape returned in employee list (sanitized, no passwordHash). */
export interface EmployeeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeListItem {
  id: string;
  userId: string;
  companyId: string;
  roleSlug: string;
  user: EmployeeUser;
}

export interface GetEmployeesResponse {
  success: true;
  message: string;
  employees: EmployeeListItem[];
}

export async function getEmployees(
  companyId: string
): Promise<GetEmployeesResponse> {
  const { data } = await apiClient.post<GetEmployeesResponse>(
    "/api/company/employees",
    { companyId }
  );
  return data;
}
