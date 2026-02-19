import type { Request, Response, NextFunction } from 'express';
import { ROLE_SLUGS, type RoleSlug } from '../constants/roles';

/**
 * Ensures the request has a business context (set by requireAuth from the access token's companyId).
 * Must run after requireAuth. Use on routes that require the user to be acting in a business context.
 * Responds with 403 if the access token has no business (e.g. new user who hasn't joined a company yet).
 */
export function requireBusinessContext(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required. Use requireAuth before requireBusinessContext.',
    });
    return;
  }
  if (!req.business || !req.businessRole) {
    res.status(403).json({
      success: false,
      message: 'No business context. Log in with a business or switch business to get a token with a company.',
    });
    return;
  }
  next();
}

/**
 * Restricts access to routes to users who have one of the given role slugs for the current business.
 * Must run after requireAuth and requireBusinessContext (req.businessRole must be set).
 * Responds with 403 if the user's role slug is not in the allowed list.
 */
export function requireBusinessRole(...allowedSlugs: RoleSlug[]) {
  const set = new Set(allowedSlugs);
  return function (req: Request, res: Response, next: NextFunction): void {
    if (!req.businessRole) {
      res.status(403).json({
        success: false,
        message: 'Business context required. Use requireBusinessContext before requireBusinessRole.',
      });
      return;
    }
    if (!set.has(req.businessRole.roleSlug as RoleSlug)) {
      res.status(403).json({
        success: false,
        message: `Insufficient role. Required one of: ${allowedSlugs.join(', ')}.`,
      });
      return;
    }
    next();
  };
}

// Convenience exports for common role checks
export const requireAdmin = requireBusinessRole(ROLE_SLUGS.ADMIN);
export const requireDispatcherOrAdmin = requireBusinessRole(ROLE_SLUGS.DISPATCHER, ROLE_SLUGS.ADMIN);
export const requireTechnicianOrAbove = requireBusinessRole(ROLE_SLUGS.TECHNICIAN, ROLE_SLUGS.DISPATCHER, ROLE_SLUGS.ADMIN);
