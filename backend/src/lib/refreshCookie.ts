import type { CookieOptions } from "express";

type SameSiteOption = "lax" | "none" | "strict";

const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function getRefreshCookieSameSite(): SameSiteOption {
  const explicit = process.env.REFRESH_COOKIE_SAME_SITE?.toLowerCase();
  if (explicit === "none" || explicit === "lax" || explicit === "strict") {
    return explicit;
  }
  if (process.env.COOKIE_CROSS_SITE === "false") {
    return "lax";
  }
  if (
    process.env.COOKIE_CROSS_SITE === "true" ||
    process.env.NODE_ENV === "production"
  ) {
    return "none";
  }
  return "lax";
}

/** Shared options for the httpOnly refresh token cookie (set/clear must match). */
export function getRefreshCookieOptions(): CookieOptions {
  const sameSite = getRefreshCookieSameSite();
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: sameSite === "none" ? true : isProduction,
    sameSite,
    path: "/api/auth",
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  };
}
