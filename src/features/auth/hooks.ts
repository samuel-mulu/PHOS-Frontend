"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { normalizeApiError } from "@/lib/api/errors";
import { refreshAccessToken } from "@/lib/api/client";
import { getRoleHomePath } from "@/types/role";
import { useAuthStore } from "@/stores/auth-store";
import {
  fetchCurrentUser,
  loginRequest,
  logoutRequest,
} from "./api";
import type { LoginFormValues } from "./schemas";

export const currentUserQueryKey = ["users", "me"] as const;

export function useCurrentUser(enabled = true) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: fetchCurrentUser,
    enabled: enabled && hasHydrated && Boolean(accessToken),
    retry: false,
  });
}

/**
 * Restores session after hard refresh / remount.
 * Uses the shared single-flight refresh so it never races the axios interceptor
 * (double refresh would revoke the first token under rotation).
 */
export function useSessionBootstrap() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const queryClient = useQueryClient();
  const bootingRef = useRef(false);

  useEffect(() => {
    if (!hasHydrated) return;

    let cancelled = false;

    async function bootstrap() {
      if (bootingRef.current) return;
      bootingRef.current = true;

      try {
        const state = useAuthStore.getState();

        if (state.accessToken) {
          try {
            await queryClient.fetchQuery({
              queryKey: currentUserQueryKey,
              queryFn: fetchCurrentUser,
            });
          } catch {
            // Interceptor already attempted single-flight refresh on 401.
            // If session is gone after that, AuthGuard will redirect.
          }
          return;
        }

        if (state.refreshToken) {
          const token = await refreshAccessToken();
          if (!token || cancelled) return;

          try {
            await queryClient.fetchQuery({
              queryKey: currentUserQueryKey,
              queryFn: fetchCurrentUser,
            });
          } catch {
            /* AuthGuard handles expired UI */
          }
        }
      } finally {
        bootingRef.current = false;
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [hasHydrated, accessToken, refreshToken, queryClient]);
}

export function useLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: LoginFormValues) => loginRequest(values),
    onSuccess: async (data) => {
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      });
      await queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
      const returnUrl = searchParams.get("returnUrl");
      const destination =
        returnUrl && returnUrl.startsWith("/")
          ? returnUrl
          : getRoleHomePath(data.user.role);
      router.replace(destination);
      toast.success("Signed in");
    },
    onError: (error) => {
      const apiError = normalizeApiError(error);
      toast.error(apiError.message);
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { refreshToken, clearSession } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      if (refreshToken) {
        try {
          await logoutRequest(refreshToken);
        } catch {
          /* clear local session even if server logout fails */
        }
      }
    },
    onSettled: () => {
      clearSession();
      queryClient.clear();
      router.replace("/login");
      toast.success("Signed out");
    },
  });
}
