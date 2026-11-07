"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, LogOut, PanelLeft, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { AppearanceControls } from "@/components/layout/appearance-controls";
import { APP_NAME } from "@/lib/constants";
import { useLogout } from "@/features/auth/hooks";
import { chartWorkspaceReturn } from "@/lib/layout/workstation-layout";
import { useSidebar } from "@/components/layout/sidebar-provider";
import { useAuthStore } from "@/stores/auth-store";

export function AppTopBar() {
  const pathname = usePathname();
  const logout = useLogout();
  const role = useAuthStore((s) => s.user?.role);
  const { sidebarOpen, chartFocus, toggleSidebar } = useSidebar();
  const exit = chartFocus ? chartWorkspaceReturn(pathname, role) : null;

  return (
    <header className="z-20 flex h-12 shrink-0 items-center gap-1 border-b border-border bg-card px-2 sm:gap-2 sm:px-3 md:px-4">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="shrink-0"
        onClick={toggleSidebar}
        aria-expanded={sidebarOpen}
        aria-label={sidebarOpen ? "Hide menu" : "Show menu"}
      >
        {sidebarOpen ? (
          <PanelLeftClose className="h-5 w-5" aria-hidden />
        ) : (
          <PanelLeft className="h-5 w-5" aria-hidden />
        )}
      </Button>

      {exit ? (
        <Link
          href={exit.href}
          className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-2 py-1.5 text-sm font-medium text-teal-800 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-400/10"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <span className="max-w-[10rem] truncate sm:max-w-none">
            {exit.label}
          </span>
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Image
            src="/logo.png"
            alt={APP_NAME}
            width={28}
            height={28}
            className="h-7 w-7 shrink-0 rounded object-contain md:hidden"
            priority
          />
          <span className="truncate text-sm font-semibold text-foreground md:hidden">
            {APP_NAME}
          </span>
          <span className="hidden truncate text-sm text-muted md:block">
            Clinical workstation
          </span>
        </div>
      )}

      {exit ? (
        <span className="ml-1 hidden min-w-0 flex-1 truncate text-sm text-muted sm:block">
          Patient chart
        </span>
      ) : null}

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <AppearanceControls />
        <NotificationBell />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 md:hidden"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
