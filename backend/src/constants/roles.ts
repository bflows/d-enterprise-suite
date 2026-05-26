/**
 * Default role slugs for business/company roles.
 * Used for permission checks and seeding.
 */
export const ROLE_SLUGS = {
  EMPLOYEE: 'employee',
  TECHNICIAN: 'technician',
  DISPATCHER: 'dispatcher',
  ADMIN: 'admin',
} as const;

export type RoleSlug = (typeof ROLE_SLUGS)[keyof typeof ROLE_SLUGS];

export const ALL_ROLE_SLUGS: readonly RoleSlug[] = [
  ROLE_SLUGS.EMPLOYEE,
  ROLE_SLUGS.TECHNICIAN,
  ROLE_SLUGS.DISPATCHER,
  ROLE_SLUGS.ADMIN,
];

/** Roles that may be assigned to jobs and appear in schedule availability pickers. */
export const SCHEDULABLE_ROLE_SLUGS: readonly RoleSlug[] = [
  ROLE_SLUGS.TECHNICIAN,
  ROLE_SLUGS.ADMIN,
];

export function isSchedulableRoleSlug(roleSlug: string): roleSlug is RoleSlug {
  const normalized = roleSlug.trim().toLowerCase();
  return (SCHEDULABLE_ROLE_SLUGS as readonly string[]).includes(normalized);
}
