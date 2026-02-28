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

/** Body for adding an employee. For existing users only email + slug; for new users also password, firstName, lastName, phoneNumber. */
export interface CreateEmployeeBody {
  email: string;
  slug?: "employee" | "technician" | "dispatcher" | "admin";
  password?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface CheckEmailResponse {
  success: true;
  exists: boolean;
  alreadyInCompany?: boolean;
  user?: { firstName: string; lastName: string; phoneNumber: string };
}

export async function checkUserByEmail(
  email: string
): Promise<CheckEmailResponse> {
  const { data } = await apiClient.get<CheckEmailResponse>(
    "/api/company/check-email",
    { params: { email: email.trim().toLowerCase() } }
  );
  return data;
}

export interface CreateEmployeeResponse {
  success: true;
  message: string;
  employee: EmployeeListItem & { company: { id: string; name: string }; role: { id: string; name: string; slug: string } };
}

export async function createEmployee(
  body: CreateEmployeeBody
): Promise<CreateEmployeeResponse> {
  const { data } = await apiClient.post<CreateEmployeeResponse>(
    "/api/company/create-employee",
    body
  );
  return data;
}

export interface TerminateEmployeeResponse {
  success: true;
  message: string;
}

export async function terminateEmployee(
  userId: string
): Promise<TerminateEmployeeResponse> {
  const { data } = await apiClient.post<TerminateEmployeeResponse>(
    "/api/company/terminate-employee",
    { userId }
  );
  return data;
}
