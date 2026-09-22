"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingBlock } from "@/components/shared/state-blocks";
import { useAuthStore } from "@/stores/auth-store";
import { useCurrentUser, useSessionBootstrap } from "@/features/auth/hooks";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  useSessionBootstrap();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const { isLoading, isError } = useCurrentUser(Boolean(accessToken));

  useEffect(() => {
    if (!accessToken && !refreshToken) {
      router.replace("/login");
    }
  }, [accessToken, refreshToken, router]);

  if (!accessToken && !refreshToken) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <LoadingBlock label="Redirecting to sign in" />
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

  if (isError) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <LoadingBlock label="Session expired" />
      </div>
    );
  }

  return <>{children}</>;
}
