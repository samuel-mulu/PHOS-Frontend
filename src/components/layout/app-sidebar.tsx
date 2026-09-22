"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";
import { navItemsForRole } from "@/lib/navigation";
import { useCurrentUser, useLogout } from "@/features/auth/hooks";
import { useWorkspaceContext } from "@/features/facilities/hooks";
import { useUnreadNotificationCount } from "@/features/notifications/hooks";

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const { facilityName, departmentName } = useWorkspaceContext(
    user?.departmentId,
  );

  if (!user) return null;

  const items = navItemsForRole(user.role);
  const { count: unreadNotifications } = useUnreadNotificationCount();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-800 bg-slate-900 text-slate-100">
      <div className="border-b border-slate-800 px-4 py-4">
        <p className="text-sm font-semibold tracking-wide">{APP_NAME}</p>
        <p className="mt-1 text-xs text-slate-400">Clinical workstation</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Main">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-teal-800/80 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="flex-1">{item.label}</span>
                  {item.href === "/notifications" && unreadNotifications > 0 ? (
                    <span className="rounded-full bg-teal-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {unreadNotifications > 99 ? "99+" : unreadNotifications}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-400">
        <p className="font-medium text-slate-200">
          {user.firstName} {user.lastName}
        </p>
        <p>{user.role.replaceAll("_", " ")}</p>
        {facilityName ? <p className="mt-2">{facilityName}</p> : null}
        {departmentName ? <p>{departmentName}</p> : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-3 hidden w-full justify-start text-slate-300 hover:bg-slate-800 hover:text-white md:inline-flex"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
