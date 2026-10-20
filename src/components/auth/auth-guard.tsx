"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthSessionSkeleton } from "@/components/shared/state-blocks";
import { useAuthStore } from "@/stores/auth-store";
import { useCurrentUser, useSessionBootstrap } from "@/features/auth/hooks";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  useSessionBootstrap();
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const { isLoading, isError, isSuccess } = useCurrentUser(
    Boolean(accessToken),
  );

  useEffect(() => {
    // Wait for sessionStorage rehydrate before treating empty tokens as logged out.
    if (!hasHydrated) return;
    if (!accessToken && !refreshToken) {
      router.replace("/login");
    }
  }, [hasHydrated, accessToken, refreshToken, router]);

  if (!hasHydrated) {
    return <AuthSessionSkeleton label="Loading session" />;
  }

  if (!accessToken && !refreshToken) {
    return <AuthSessionSkeleton label="Redirecting to sign in" />;
  }

  if (!accessToken && refreshToken) {
    return <AuthSessionSkeleton label="Restoring session" />;
  }

  if (isLoading) {
    return <AuthSessionSkeleton label="Restoring session" />;
  }

  if (isError || !isSuccess) {
    return <AuthSessionSkeleton label="Session expired" />;
  }

  return <>{children}</>;
}
