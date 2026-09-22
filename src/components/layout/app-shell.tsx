"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { LoadingBlock } from "@/components/shared/state-blocks";
import { canAccessRoute } from "@/lib/navigation";
import { useCurrentUser } from "@/features/auth/hooks";
import { NetworkStatusBanner } from "@/components/shared/network-status-banner";
import { useOperationalSync } from "@/lib/realtime/use-operational-sync";

export function AppShell({ children }: { children: React.ReactNode }) {
  useOperationalSync();
  const pathname = usePathname();
  const router = useRouter();
  const { data: user, isLoading } = useCurrentUser();

  useEffect(() => {
    if (!user) return;
    if (!canAccessRoute(user.role, pathname)) {
      router.replace("/forbidden");
    }
  }, [user, pathname, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <LoadingBlock label="Loading workspace" />
      </div>
    );
  }

  if (!canAccessRoute(user.role, pathname)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <LoadingBlock label="Checking permissions" />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1">
      <div className="hidden md:flex md:shrink-0">
        <AppSidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <NetworkStatusBanner />
        <AppHeader />
        <main className="flex-1 bg-slate-50 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
