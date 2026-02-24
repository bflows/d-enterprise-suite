import { authClient, apiClient } from "@/lib/api/client";
import type {
  AuthSuccessResponse,
  ApiErrorResponse,
  AuthenticatedUser,
  EmploymentResponse,
} from "@/types/auth";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export type AuthApiResponse = AuthSuccessResponse | ApiErrorResponse;

function isAuthSuccess(
  res: AuthApiResponse
): res is AuthSuccessResponse {
  return res.success === true && "accessToken" in res;
}

export async function login(
  credentials: LoginCredentials
): Promise<AuthSuccessResponse> {
  const { data } = await authClient.post<AuthApiResponse>(
    "/api/auth/login",
    credentials
  );
  if (!isAuthSuccess(data)) {
    throw new Error((data as ApiErrorResponse).message ?? "Login failed");
  }
  return data;
}

export async function register(
  credentials: RegisterCredentials
): Promise<AuthSuccessResponse> {
  const { data } = await authClient.post<AuthApiResponse>(
    "/api/auth/register",
    credentials
  );
  if (!isAuthSuccess(data)) {
    throw new Error((data as ApiErrorResponse).message ?? "Registration failed");
  }
  return data;
}

export async function refresh(): Promise<AuthSuccessResponse> {
  const { data } = await authClient.post<
    AuthSuccessResponse | ApiErrorResponse
  >("/api/auth/refresh");
  if (!isAuthSuccess(data)) {
    throw new Error(
      (data as ApiErrorResponse).message ?? "Token refresh failed"
    );
  }
  return data;
}

export async function logout(): Promise<void> {
  await authClient.post("/api/auth/logout");
}

export async function getMe(): Promise<{ user: AuthenticatedUser }> {
  const { data } = await apiClient.post<{ success: true; user: AuthenticatedUser }>(
    "/api/auth/me"
  );
  return { user: data.user };
}

export async function getEmployment(): Promise<{
  employments: EmploymentResponse["employments"];
  currentCompany: EmploymentResponse["currentCompany"];
  currentRole: EmploymentResponse["currentRole"];
}> {
  const { data } = await apiClient.post<EmploymentResponse>(
    "/api/auth/employment"
  );
  return {
    employments: data.employments,
    currentCompany: data.currentCompany,
    currentRole: data.currentRole,
  };
}
