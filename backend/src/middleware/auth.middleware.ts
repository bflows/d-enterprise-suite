import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { verifyAccessToken } from '../services/token.service';
import { ROLE_SLUGS } from '../constants/roles';

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
    let roleSlug: string = ROLE_SLUGS.UNEMPLOYED;

    if (payload.companyId) {
      const employee = await prisma.employee.findFirst({
        where: { userId: payload.sub, companyId: payload.companyId },
        include: { company: true, role: true },
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
        slug: employee.company.slug,
      };
      req.businessRole = {
        roleId: employee.role.id,
        roleSlug: employee.role.slug ?? ROLE_SLUGS.UNEMPLOYED,
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
