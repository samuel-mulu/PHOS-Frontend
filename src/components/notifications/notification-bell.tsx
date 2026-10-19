"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from "@/features/notifications/hooks";
import { notificationHref } from "@/lib/notifications/resolve-link";
import {
  priorityForNotification,
  priorityLabel,
} from "@/lib/notifications/priority";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { count } = useUnreadNotificationCount();
  const unreadQuery = useNotifications(true, 60_000);
  const markRead = useMarkNotificationRead();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) void unreadQuery.refetch();
    // Refetch only when the panel opens; socket keeps the badge live.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [open]);

  const items = unreadQuery.data?.slice(0, 8) ?? [];

  return (
    <div ref={rootRef} className="relative shrink-0">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="relative text-slate-700"
        aria-label={
          count > 0 ? `${count} unread notifications` : "Notifications"
        }
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-5 w-5" aria-hidden />
        {count > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div
          className="absolute right-0 z-50 mt-1 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
          role="menu"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            <Link
              href="/notifications"
              className="text-xs font-medium text-teal-800 hover:underline"
              onClick={() => setOpen(false)}
            >
              View all
            </Link>
          </div>

          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-500">
              No unread alerts
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((n) => {
                const href = notificationHref(n);
                const pri = priorityForNotification(n);
                return (
                  <li
                    key={n.id}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <button
                      type="button"
                      className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left hover:bg-slate-50"
                      onClick={() => {
                        if (!n.readAt) markRead.mutate(n.id);
                        setOpen(false);
                        if (href) router.push(href);
                        else router.push("/notifications");
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded px-1 py-0.5 text-[10px] font-semibold",
                            pri === "CRITICAL" && "bg-red-100 text-red-800",
                            pri === "HIGH" && "bg-amber-100 text-amber-900",
                            pri === "NORMAL" && "bg-slate-100 text-slate-700",
                          )}
                        >
                          {priorityLabel(pri)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {format(new Date(n.createdAt), "MMM d, HH:mm")}
                        </span>
                      </span>
                      <span className="text-sm font-medium text-slate-900">
                        {n.title}
                      </span>
                      <span className="line-clamp-2 text-xs text-slate-600">
                        {n.message}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
