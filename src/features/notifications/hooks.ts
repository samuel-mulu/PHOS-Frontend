"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { normalizeApiError } from "@/lib/api/errors";
import {
  fetchNotifications,
  fetchNotificationSummary,
  markAllNotificationsRead,
  markNotificationRead,
  type AlertPriority,
} from "./api";

export const notificationsQueryKey = ["notifications"] as const;
export const notificationSummaryQueryKey = [
  "notifications",
  "summary",
] as const;

export function useNotifications(
  unreadOnly?: boolean,
  refetchInterval = 60_000,
  priority?: AlertPriority,
) {
  return useQuery({
    queryKey: [
      ...notificationsQueryKey,
      unreadOnly ? "unread" : "all",
      priority ?? "any",
    ],
    queryFn: () => fetchNotifications(unreadOnly, priority),
    refetchInterval,
  });
}

export function useNotificationSummary(refetchInterval = 60_000) {
  return useQuery({
    queryKey: notificationSummaryQueryKey,
    queryFn: fetchNotificationSummary,
    refetchInterval,
  });
}

export function useUnreadNotificationCount() {
  const query = useNotificationSummary();
  return {
    count: query.data?.total ?? 0,
    byPriority: query.data?.byPriority,
    isLoading: query.isLoading,
  };
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      void queryClient.invalidateQueries({
        queryKey: notificationSummaryQueryKey,
      });
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      void queryClient.invalidateQueries({
        queryKey: notificationSummaryQueryKey,
      });
      toast.success("All notifications marked read");
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });
}
