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

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
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
    setSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
    });
    return data.accessToken;
  } catch {
    clearSession();
    return null;
  }
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
    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
    const token = await refreshPromise;
    if (!token) return Promise.reject(normalizeApiError(error));

    original.headers.Authorization = `Bearer ${token}`;
    return api(original);
  },
);
