"use client";

import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { env } from "@/lib/env";
import { ApiError, normalizeApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/stores/auth-store";
import type { AuthTokensResponse } from "@/types/auth";

export const api = axios.create({
  baseURL: env.NEXT_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

/** Single-flight refresh so bootstrap + interceptor never rotate twice. */
let refreshPromise: Promise<string | null> | null = null;

/**
 * Rotate refresh token once. Always writes new tokens to the store on success
 * (even if a React effect was cancelled) so Strict Mode remounts don't lose
 * the rotated token and then clear the session.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const { refreshToken, setSession, clearSession } = useAuthStore.getState();
    if (!refreshToken) {
      clearSession();
      return null;
    }

    try {
      const { data } = await axios.post<AuthTokensResponse>(
        `${env.NEXT_PUBLIC_API_URL}/auth/refresh`,
        { refreshToken },
        { withCredentials: true },
      );
      // Persist immediately — must not depend on React effect cancellation.
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      });
      return data.accessToken;
    } catch (error) {
      const normalized = normalizeApiError(error);
      // Only wipe local session on definitive auth rejection, not network blips.
      if (normalized.statusCode === 401 || normalized.statusCode === 403) {
        clearSession();
      }
      return null;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("phos:api-reachable"));
    }
    return response;
  },
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (
      typeof window !== "undefined" &&
      !error.response &&
      original?.url &&
      !original.url.includes("/auth/login")
    ) {
      window.dispatchEvent(new Event("phos:api-unreachable"));
    }

    if (
      error.response?.status !== 401 ||
      !original ||
      original._retry ||
      original.url?.includes("/auth/login") ||
      original.url?.includes("/auth/refresh")
    ) {
      const normalized = normalizeApiError(error);
      return Promise.reject(
        normalized instanceof ApiError ? normalized : error,
      );
    }

    original._retry = true;
    const token = await refreshAccessToken();
    if (!token) return Promise.reject(normalizeApiError(error));

    original.headers.Authorization = `Bearer ${token}`;
    return api(original);
  },
);
