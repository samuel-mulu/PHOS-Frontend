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
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/features/notifications/hooks";
import {
  notificationCategory,
  notificationHref,
} from "@/lib/notifications/resolve-link";
import { cn } from "@/lib/utils";

export function NotificationCenter() {
  const [filterUnread, setFilterUnread] = useState(false);
  const query = useNotifications(filterUnread);
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
            Operational alerts from the clinic system. Lists refresh automatically;
            realtime push is not enabled on the backend yet.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
        <DataTable>
          <DataTableHead>
            <DataTableRow>
              <DataTableHeaderCell>When</DataTableHeaderCell>
              <DataTableHeaderCell>Category</DataTableHeaderCell>
              <DataTableHeaderCell>Title</DataTableHeaderCell>
              <DataTableHeaderCell>Message</DataTableHeaderCell>
              <DataTableHeaderCell className="text-right">
                Actions
              </DataTableHeaderCell>
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {query.data.map((n) => {
              const href = notificationHref(n);
              const unread = !n.readAt;
              return (
                <DataTableRow
                  key={n.id}
                  className={cn(unread && "bg-teal-50/50")}
                >
                  <DataTableCell className="whitespace-nowrap text-xs text-slate-600">
                    {format(new Date(n.createdAt), "MMM d, HH:mm")}
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
                  <DataTableCell className="text-right">
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
      ) : null}
    </div>
  );
}
