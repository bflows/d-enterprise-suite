/**
 * Role slugs aligned with backend constants/roles.ts
 */
export const ROLE_SLUGS = {
  EMPLOYEE: "employee",
  TECHNICIAN: "technician",
  DISPATCHER: "dispatcher",
  ADMIN: "admin",
} as const;

export type RoleSlug = (typeof ROLE_SLUGS)[keyof typeof ROLE_SLUGS];

export const ALL_ROLE_SLUGS: readonly RoleSlug[] = [
  ROLE_SLUGS.EMPLOYEE,
  ROLE_SLUGS.TECHNICIAN,
  ROLE_SLUGS.DISPATCHER,
  ROLE_SLUGS.ADMIN,
];

/** Roles that may be assigned to jobs and use technician field-work flows. */
export const SCHEDULABLE_ROLE_SLUGS: readonly RoleSlug[] = [
  ROLE_SLUGS.TECHNICIAN,
  ROLE_SLUGS.ADMIN,
];

export function isSchedulableRoleSlug(roleSlug: string): roleSlug is RoleSlug {
  const normalized = roleSlug.trim().toLowerCase();
  return (SCHEDULABLE_ROLE_SLUGS as readonly string[]).includes(normalized);
}

/** Roles that may clock in/out and load active time card state (aligned with time-card API). */
export const TIME_CARD_CLOCK_ROLE_SLUGS: readonly RoleSlug[] = [
  ROLE_SLUGS.EMPLOYEE,
  ROLE_SLUGS.TECHNICIAN,
  ROLE_SLUGS.DISPATCHER,
  ROLE_SLUGS.ADMIN,
];

/** User as returned by login/register/refresh/me (no passwordHash) */
export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  createdAt: string;
  updatedAt: string;
  /** Set when user has company context (e.g. from /me or after refresh with company) */
  role?: string;
}

/** API response shape for login, register, refresh */
export interface AuthSuccessResponse {
  success: true;
  message?: string;
  accessToken: string;
  user: AuthenticatedUser;
}

/** API response shape for /me */
export interface GetMeResponse {
  success: true;
  user: AuthenticatedUser;
}

/** Generic API error shape */
export interface ApiErrorResponse {
  success: false;
  message: string;
}

/** Field-level errors from POST /api/auth/login */
export type AuthLoginFieldKey = "email" | "password";

export interface AuthLoginFailureResponse {
  success: false;
  errors?: Partial<Record<AuthLoginFieldKey, string>>;
  message?: string;
}

/** Single employment as returned by POST /api/auth/employment */
export interface EmploymentItem {
  companyId: string;
  companyName: string;
  roleSlug: string;
}

/** API response shape for POST /api/auth/employment */
export interface EmploymentResponse {
  success: true;
  employments: EmploymentItem[];
  currentCompany: { id: string; name: string } | null;
  currentRole: string | null;
}
