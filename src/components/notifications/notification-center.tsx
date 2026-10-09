"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/shared/data-table";
import {
  EmptyState,
  ErrorState,
  LoadingBlock,
} from "@/components/shared/state-blocks";
import { QueryStaleBanner } from "@/components/shared/query-stale-banner";
import { ExpandablePanel } from "@/components/shared/table-layout";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/features/notifications/hooks";
import {
  notificationCategory,
  notificationHref,
} from "@/lib/notifications/resolve-link";
import {
  priorityForNotification,
  priorityLabel,
  type AlertPriority,
} from "@/lib/notifications/priority";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES: Record<AlertPriority, string> = {
  CRITICAL: "bg-red-100 text-red-900",
  HIGH: "bg-amber-100 text-amber-900",
  NORMAL: "bg-slate-100 text-slate-700",
};

export function NotificationCenter() {
  const [filterUnread, setFilterUnread] = useState(false);
  const [priority, setPriority] = useState<AlertPriority | "ALL">("ALL");
  const query = useNotifications(
    filterUnread,
    30_000,
    priority === "ALL" ? undefined : priority,
  );
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const unreadCount =
    query.data?.filter((n) => !n.readAt).length ??
    (filterUnread ? query.data?.length : undefined);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-600">
            Alert center with Critical / High / Normal priority. Payment requests
            from doctors appear as High priority.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["ALL", "CRITICAL", "HIGH", "NORMAL"] as const).map((p) => (
            <Button
              key={p}
              type="button"
              variant={priority === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPriority(p)}
            >
              {p === "ALL" ? "All priorities" : priorityLabel(p)}
            </Button>
          ))}
          <Button
            type="button"
            variant={filterUnread ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterUnread((v) => !v)}
          >
            {filterUnread ? "Showing unread" : "All"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={markAll.isPending || !query.data?.some((n) => !n.readAt)}
            onClick={() => markAll.mutate()}
          >
            Mark all read
          </Button>
        </div>
      </div>

      {typeof unreadCount === "number" && unreadCount > 0 ? (
        <p className="flex items-center gap-2 text-sm text-teal-800">
          <Bell className="h-4 w-4" aria-hidden />
          {unreadCount} unread
        </p>
      ) : null}

      <QueryStaleBanner query={query} />

      {query.isLoading ? <LoadingBlock label="Loading notifications" /> : null}
      {query.isError ? (
        <ErrorState
          message="Could not load notifications."
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.isSuccess && query.data.length === 0 ? (
        <EmptyState
          title="No notifications"
          description={
            filterUnread
              ? "You have read everything in the inbox."
              : "Alerts will appear here when the system sends them."
          }
        />
      ) : null}

      {query.isSuccess && query.data.length > 0 ? (
        <ExpandablePanel title="Inbox">
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>When</DataTableHeaderCell>
                <DataTableHeaderCell>Priority</DataTableHeaderCell>
                <DataTableHeaderCell>Category</DataTableHeaderCell>
                <DataTableHeaderCell>Title</DataTableHeaderCell>
                <DataTableHeaderCell>Message</DataTableHeaderCell>
                <DataTableHeaderCell stickyRight className="text-right">
                  Actions
                </DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {query.data.map((n) => {
                const href = notificationHref(n);
                const unread = !n.readAt;
                const pri = priorityForNotification(n);
                return (
                  <DataTableRow
                    key={n.id}
                    className={cn(unread && "bg-teal-50/50")}
                  >
                    <DataTableCell className="whitespace-nowrap text-xs text-slate-600">
                      {format(new Date(n.createdAt), "MMM d, HH:mm")}
                    </DataTableCell>
                    <DataTableCell className="text-xs">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 font-medium",
                          PRIORITY_STYLES[pri],
                        )}
                      >
                        {priorityLabel(pri)}
                      </span>
                    </DataTableCell>
                    <DataTableCell className="text-xs">
                      {notificationCategory(n.type)}
                    </DataTableCell>
                    <DataTableCell className="font-medium text-slate-900">
                      {n.title}
                    </DataTableCell>
                    <DataTableCell className="max-w-md text-sm text-slate-600">
                      {n.message}
                    </DataTableCell>
                    <DataTableCell stickyRight className="text-right">
                      <div className="flex justify-end gap-2">
                        {href ? (
                          <Link href={href}>
                            <Button type="button" size="sm" variant="outline">
                              Open
                            </Button>
                          </Link>
                        ) : null}
                        {unread ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={markRead.isPending}
                            onClick={() => markRead.mutate(n.id)}
                          >
                            Mark read
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">Read</span>
                        )}
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                );
              })}
            </DataTableBody>
          </DataTable>
        </ExpandablePanel>
      ) : null}
    </div>
  );
}
