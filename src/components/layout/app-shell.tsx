"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopBar } from "@/components/layout/app-top-bar";
import {
  SidebarProvider,
  useSidebar,
} from "@/components/layout/sidebar-provider";
import { LoadingBlock } from "@/components/shared/state-blocks";
import { canAccessRoute } from "@/lib/navigation";
import { useCurrentUser } from "@/features/auth/hooks";
import { NetworkStatusBanner } from "@/components/shared/network-status-banner";
import { useOperationalSync } from "@/lib/realtime/use-operational-sync";
import { cn } from "@/lib/utils";

function AppShellFrame({ children }: { children: React.ReactNode }) {
  useOperationalSync();
  const pathname = usePathname();
  const router = useRouter();
  const { data: user, isLoading } = useCurrentUser();
  const { sidebarOpen, chartFocus, setSidebarOpen } = useSidebar();

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

  const showSidebar = sidebarOpen;
  const sidebarOverlay = chartFocus && showSidebar;

  return (
    <div className="flex h-dvh overflow-hidden">
      {sidebarOverlay ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-900/40 md:block"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div
        className={cn(
          "h-full shrink-0 transition-[width,margin] duration-200 ease-out",
          showSidebar ? "w-64" : "w-0 overflow-hidden",
          sidebarOverlay &&
            "fixed inset-y-0 left-0 z-40 w-64 shadow-2xl md:fixed",
        )}
      >
        {showSidebar ? (
          <AppSidebar onNavigate={() => chartFocus && setSidebarOpen(false)} />
        ) : null}
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <NetworkStatusBanner />
        <AppTopBar />
        <main
          className={cn(
            "min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6",
            chartFocus && "md:p-4 lg:p-5",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppShellFrame>{children}</AppShellFrame>
    </SidebarProvider>
  );
}
