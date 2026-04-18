import { isAxiosError } from "axios";
import { authClient, apiClient } from "@/lib/api/client";
import type {
  AuthSuccessResponse,
  ApiErrorResponse,
  AuthLoginFailureResponse,
  AuthLoginFieldKey,
  AuthenticatedUser,
  EmploymentResponse,
} from "@/types/auth";

export interface LoginCredentials {
  email: string;
  password: string;
}

// export interface RegisterCredentials {
//   email: string;
//   password: string;
//   firstName: string;
//   lastName: string;
//   phoneNumber: string;
// }

export type AuthApiResponse = AuthSuccessResponse | ApiErrorResponse;

type LoginPostBody = AuthSuccessResponse | AuthLoginFailureResponse;

function isAuthSuccess(
  res: AuthSuccessResponse | AuthLoginFailureResponse | ApiErrorResponse
): res is AuthSuccessResponse {
  return res.success === true && "accessToken" in res;
}

function extractLoginFieldErrors(
  data: unknown
): Partial<Record<AuthLoginFieldKey, string>> | null {
  if (!data || typeof data !== "object") return null;
  const errors = (data as AuthLoginFailureResponse).errors;
  if (!errors || typeof errors !== "object") return null;
  const out: Partial<Record<AuthLoginFieldKey, string>> = {};
  if (typeof errors.email === "string") out.email = errors.email;
  if (typeof errors.password === "string") out.password = errors.password;
  return Object.keys(out).length > 0 ? out : null;
}

export class LoginRequestError extends Error {
  readonly fieldErrors?: Partial<Record<AuthLoginFieldKey, string>>;

  constructor(message: string, fieldErrors?: Partial<Record<AuthLoginFieldKey, string>>) {
    super(message);
    this.name = "LoginRequestError";
    this.fieldErrors = fieldErrors;
  }
}

export type LoginFailurePayload =
  | { kind: "fields"; errors: Partial<Record<AuthLoginFieldKey, string>> }
  | { kind: "general"; message: string };

export function toLoginFailurePayload(error: unknown): LoginFailurePayload {
  if (error instanceof LoginRequestError) {
    const fe = error.fieldErrors;
    if (fe && Object.keys(fe).length > 0) {
      return { kind: "fields", errors: fe };
    }
    return { kind: "general", message: error.message };
  }
  if (isAxiosError(error)) {
    const body = error.response?.data;
    const fieldErrors = extractLoginFieldErrors(body);
    const messageFromBody =
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : null;
    if (fieldErrors) {
      return {
        kind: "fields",
        errors: fieldErrors,
      };
    }
    return {
      kind: "general",
      message: messageFromBody ?? error.message ?? "Login failed",
    };
  }
  if (error instanceof Error) {
    return { kind: "general", message: error.message };
  }
  return { kind: "general", message: "Login failed" };
}

export async function login(
  credentials: LoginCredentials
): Promise<AuthSuccessResponse> {
  try {
    const { data } = await authClient.post<LoginPostBody>(
      "/api/auth/login",
      credentials
    );
    if (isAuthSuccess(data)) return data;
    const fieldErrors = extractLoginFieldErrors(data);
    const message =
      (data as ApiErrorResponse).message ??
      (data as AuthLoginFailureResponse).message ??
      "Login failed";
    if (fieldErrors) throw new LoginRequestError(message, fieldErrors);
    throw new LoginRequestError(message);
  } catch (e) {
    if (e instanceof LoginRequestError) throw e;
    if (isAxiosError(e)) {
      const body = e.response?.data;
      const fieldErrors = extractLoginFieldErrors(body);
      const messageFromBody =
        body &&
        typeof body === "object" &&
        "message" in body &&
        typeof (body as { message: unknown }).message === "string"
          ? (body as { message: string }).message
          : null;
      if (fieldErrors) {
        throw new LoginRequestError(
          messageFromBody ?? e.message ?? "Login failed",
          fieldErrors
        );
      }
      throw new LoginRequestError(
        messageFromBody ?? e.message ?? "Login failed"
      );
    }
    throw e;
  }
}

// export async function register(
//   credentials: RegisterCredentials
// ): Promise<AuthSuccessResponse> {
//   const { data } = await authClient.post<AuthApiResponse>(
//     "/api/auth/register",
//     credentials
//   );
//   if (!isAuthSuccess(data)) {
//     throw new Error((data as ApiErrorResponse).message ?? "Registration failed");
//   }
//   return data;
// }

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
