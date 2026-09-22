"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import { useLogout } from "@/features/auth/hooks";
import { MobileNav } from "./mobile-nav";

export function AppHeader() {
  const logout = useLogout();

  return (
    <header className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-3 md:hidden">
      <div className="flex items-center gap-2">
        <MobileNav />
        <span className="text-sm font-semibold text-slate-900">{APP_NAME}</span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        aria-label="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </header>
  );
}
