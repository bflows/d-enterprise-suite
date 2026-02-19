import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { verifyAccessToken } from '../services/token.service';
import { ROLE_SLUGS, type RoleSlug } from '../constants/roles';

/**
 * Extracts Bearer token from Authorization header.
 * Client should send: Authorization: Bearer <accessToken>
 */
function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7).trim() || null;
}

/**
 * Auth middleware: verifies the access JWT, loads the user, and (when token has companyId)
 * loads the user's business and role for that business from the DB.
 * Sets req.user; sets req.business and req.businessRole when the token includes a company.
 * Responds with 401 if token is missing or invalid, or if token has companyId but user is no longer employed there.
 *
 * Company context (companyId) is set at login and refresh from the user's first employment. When the
 * token has no companyId (user has no employment yet), req.business and req.businessRole stay unset
 * and requireRole(...) returns 403 "No business context" until they log in again or refresh after being added.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = getBearerToken(req);
    if (!token) {
      res.status(401).json({
        success: false,
        message: "Valid access token required",
      });
      return;
    }

    let payload: ReturnType<typeof verifyAccessToken>;
    try {
      payload = verifyAccessToken(token);
    } catch {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired access token.',
      });
      return;
    }

    if (payload.sid) {
      const session = await prisma.refreshSession.findUnique({
        where: { id: payload.sid },
      });
      if (!session || session.revokedAt) {
        res.status(401).json({
          success: false,
          message: 'Session has been revoked. Please log in again.',
        });
        return;
      }
    }

    const userRecord = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!userRecord) {
      res.status(401).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }

    const { passwordHash: _p, ...user } = userRecord;
    let roleSlug: string = ROLE_SLUGS.EMPLOYEE;

    if (payload.companyId) {
      const employee = await prisma.employee.findFirst({
        where: { userId: payload.sub, companyId: payload.companyId },
        include: { company: true },
      });
      if (!employee) {
        res.status(401).json({
          success: false,
          message: 'No longer employed at this business. Please log in again or switch business.',
        });
        return;
      }
      req.business = {
        id: employee.company.id,
        name: employee.company.name,
      };
      req.businessRole = {
        roleSlug: employee.roleSlug,
      };
      roleSlug = req.businessRole.roleSlug;
    }

    req.user = { ...user, role: roleSlug };
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error.',
    });
  }
}

/**
 * Role guard. Use after requireAuth.
 * - requireRole() — any authenticated user (no business context required).
 * - requireRole('admin') or requireRole('dispatcher', 'admin') — requires business context and one of the given role slugs.
 */
export function requireRole(...allowedSlugs: RoleSlug[]) {
  const set = new Set(allowedSlugs);
  return function (req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Use requireAuth before requireRole.',
      });
      return;
    }
    if (allowedSlugs.length === 0) {
      next();
      return;
    }
    if (!req.business || !req.businessRole) {
      res.status(403).json({
        success: false,
        message: 'No business context. Log in or refresh to get a token with company context (set from your first employment).',
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
