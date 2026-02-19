import type { User } from '@prisma/client';

export type AuthenticatedUser = Omit<User, 'passwordHash'> & { role: string };

/** Current business/company context (set by requireAuth when token has companyId). */
export interface BusinessContext {
  id: string;
  name: string;
}

/** User's role at the current business (set by requireAuth when token has companyId). */
export interface BusinessRoleContext {
  roleSlug: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      /** Set by requireAuth when token has companyId: the company/business for this request. */
      business?: BusinessContext;
      /** Set by requireAuth when token has companyId: the user's role at the current business. */
      businessRole?: BusinessRoleContext;
    }
  }
}

export {};
