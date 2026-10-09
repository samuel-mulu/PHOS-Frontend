"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingBlock } from "@/components/shared/state-blocks";
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
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <LoadingBlock label="Loading session" />
      </div>
    );
  }

  if (!accessToken && !refreshToken) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <LoadingBlock label="Redirecting to sign in" />
      </div>
    );
  }

  // Refresh-only restore (access expired, refresh still present).
  if (!accessToken && refreshToken) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <LoadingBlock label="Restoring session" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <LoadingBlock label="Restoring session" />
      </div>
    );
  }

  if (isError || !isSuccess) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <LoadingBlock label="Session expired" />
      </div>
    );
  }

  return <>{children}</>;
}
