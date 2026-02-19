import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || '';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || '';
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY_DAYS = Number(process.env.JWT_REFRESH_EXPIRY_DAYS) || 7;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set");
}

/** Access token payload: user + current business. Role is resolved from DB when verifying. */
export function generateAccessToken(
  userId: string,
  companyId: string | undefined,
  sessionId?: string
) {
  const payload: AccessTokenPayload = { sub: userId };
  if (companyId) payload.companyId = companyId;
  if (sessionId) payload.sid = sessionId;
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY } as SignOptions);
}

/** Refresh token payload: preserves companyId so refreshed access token keeps same business context. */
export function generateRefreshToken(
  sessionId: string,
  userId: string,
  companyId?: string
) {
  const payload: RefreshTokenPayload = { sid: sessionId, sub: userId };
  if (companyId) payload.companyId = companyId;
  return jwt.sign(
    payload,
    REFRESH_SECRET,
    { expiresIn: `${REFRESH_EXPIRY_DAYS}d` } as SignOptions
  );
}

export function hashRefreshToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export type RefreshTokenPayload = { sid: string; sub: string; companyId?: string };

export type AccessTokenPayload = { sub: string; companyId?: string; sid?: string };

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as RefreshTokenPayload;
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

export function getRefreshExpiresAt() {
  return new Date(Date.now() + REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}
