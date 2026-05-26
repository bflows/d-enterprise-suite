import axios, { type AxiosInstance } from "axios";
import { getAccessToken, setAccessToken, clearAccessToken } from "@/lib/auth/tokenStore";
import { resolveApiBaseUrl } from "@/lib/api/baseUrl";

const baseURL = resolveApiBaseUrl();

/** Axios instance for auth endpoints only. No Bearer token, no 401 retry. Used for login, register, refresh, logout. */
export const authClient: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

/** Callback set by app when refresh succeeds in interceptor (updates Redux + tokenStore). */
let onRefreshSuccess: ((accessToken: string, user: import("@/types/auth").AuthenticatedUser) => void) | null = null;

/** Callback when refresh fails (clear auth, redirect to login). */
let onRefreshFailure: (() => void) | null = null;

export function setRefreshSuccessCallback(
  cb: (accessToken: string, user: import("@/types/auth").AuthenticatedUser) => void
): void {
  onRefreshSuccess = cb;
}

export function setRefreshFailureCallback(cb: () => void): void {
  onRefreshFailure = cb;
}

/** Main API client: adds Bearer token, retries on 401 after refresh. */
export const apiClient: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing = false;
const failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(err: unknown) {
  failedQueue.forEach((p) => p.reject(err));
  failedQueue.length = 0;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (refreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => apiClient(originalRequest))
        .catch((e) => Promise.reject(e));
    }

    originalRequest._retry = true;
    refreshing = true;

    try {
      const { data } = await authClient.post<{
        success: true;
        accessToken: string;
        user: import("@/types/auth").AuthenticatedUser;
      }>("/api/auth/refresh");
      const token = data.accessToken;
      const user = data.user;
      setAccessToken(token);
      if (onRefreshSuccess) {
        onRefreshSuccess(token, user);
      }
      failedQueue.forEach((p) => p.resolve());
      failedQueue.length = 0;
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      clearAccessToken();
      if (typeof window !== "undefined" && onRefreshFailure) {
        onRefreshFailure();
      }
      return Promise.reject(refreshError);
    } finally {
      refreshing = false;
    }
  }
);
