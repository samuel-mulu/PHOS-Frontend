"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, LogOut, PanelLeft, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import { useLogout } from "@/features/auth/hooks";
import { chartWorkspaceReturn } from "@/lib/layout/workstation-layout";
import { useSidebar } from "@/components/layout/sidebar-provider";

export function AppTopBar() {
  const pathname = usePathname();
  const logout = useLogout();
  const { sidebarOpen, chartFocus, toggleSidebar } = useSidebar();
  const exit = chartFocus ? chartWorkspaceReturn(pathname) : null;

  return (
    <header className="z-20 flex h-12 shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-2 sm:gap-2 sm:px-3 md:px-4">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="shrink-0 text-slate-700"
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
          className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-2 py-1.5 text-sm font-medium text-teal-800 hover:bg-teal-50"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <span className="max-w-[10rem] truncate sm:max-w-none">
            {exit.label}
          </span>
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-900 md:hidden">
            {APP_NAME}
          </span>
          <span className="hidden truncate text-sm text-slate-600 md:block">
            Clinical workstation
          </span>
        </div>
      )}

      {exit ? (
        <span className="ml-1 hidden min-w-0 flex-1 truncate text-sm text-slate-500 sm:block">
          Patient chart
        </span>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="ml-auto shrink-0 text-slate-600 md:hidden"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        aria-label="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </header>
  );
}
