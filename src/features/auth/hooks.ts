"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { normalizeApiError } from "@/lib/api/errors";
import { getRoleHomePath } from "@/types/role";
import { useAuthStore } from "@/stores/auth-store";
import {
  fetchCurrentUser,
  loginRequest,
  logoutRequest,
  refreshRequest,
} from "./api";
import type { LoginFormValues } from "./schemas";

export const currentUserQueryKey = ["users", "me"] as const;

export function useCurrentUser(enabled = true) {
  const accessToken = useAuthStore((s) => s.accessToken);

  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: fetchCurrentUser,
    enabled: enabled && Boolean(accessToken),
  });
}

export function useSessionBootstrap() {
  const { accessToken, refreshToken, setSession, clearSession } =
    useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (accessToken) {
        try {
          await queryClient.fetchQuery({
            queryKey: currentUserQueryKey,
            queryFn: fetchCurrentUser,
          });
        } catch {
          if (refreshToken) {
            try {
              const data = await refreshRequest(refreshToken);
              if (!cancelled) {
                setSession({
                  accessToken: data.accessToken,
                  refreshToken: data.refreshToken,
                  user: data.user,
                });
                await queryClient.fetchQuery({
                  queryKey: currentUserQueryKey,
                  queryFn: fetchCurrentUser,
                });
              }
            } catch {
              if (!cancelled) clearSession();
            }
          } else if (!cancelled) {
            clearSession();
          }
        }
        return;
      }

      if (refreshToken) {
        try {
          const data = await refreshRequest(refreshToken);
          if (!cancelled) {
            setSession({
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
              user: data.user,
            });
            await queryClient.fetchQuery({
              queryKey: currentUserQueryKey,
              queryFn: fetchCurrentUser,
            });
          }
        } catch {
          if (!cancelled) clearSession();
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [
    accessToken,
    refreshToken,
    setSession,
    clearSession,
    queryClient,
  ]);
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
