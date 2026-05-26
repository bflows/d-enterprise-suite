function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Browser API base URL.
 * Empty string = same-origin `/api/*` (proxied to the backend via next.config rewrites).
 * Set NEXT_PUBLIC_API_URL only when the client must call the API host directly (e.g. local dev).
 */
export function resolveBrowserApiBaseUrl(): string {
  const publicUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (publicUrl) {
    return trimTrailingSlash(publicUrl);
  }
  return "";
}

/** Server-side API base URL (SSR / server actions). */
export function resolveServerApiBaseUrl(): string {
  const serverUrl =
    process.env.API_URL?.trim() ||
    process.env.API_PROXY_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim();
  if (serverUrl) {
    return trimTrailingSlash(serverUrl);
  }
  return "http://localhost:5000";
}

export function resolveApiBaseUrl(): string {
  return typeof window !== "undefined"
    ? resolveBrowserApiBaseUrl()
    : resolveServerApiBaseUrl();
}
