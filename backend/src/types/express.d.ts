import type { User } from '@prisma/client';

export type AuthenticatedUser = Omit<User, 'passwordHash'> & { role: string };

/** Current business/company context (set by requireBusinessContext). */
export interface BusinessContext {
  id: string;
  name: string;
  slug: string;
}

/** User's role at the current business (set by requireBusinessContext). */
export interface BusinessRoleContext {
  roleId: string;
  roleSlug: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      /** Set by requireBusinessContext: the company/business for this request. */
      business?: BusinessContext;
      /** Set by requireBusinessContext: the user's role at the current business. */
      businessRole?: BusinessRoleContext;
    }
  }
}

export {};
