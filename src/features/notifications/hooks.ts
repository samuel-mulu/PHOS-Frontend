"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { normalizeApiError } from "@/lib/api/errors";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AlertPriority,
} from "./api";

export const notificationsQueryKey = ["notifications"] as const;

export function useNotifications(
  unreadOnly?: boolean,
  refetchInterval = 30_000,
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

export function useUnreadNotificationCount() {
  const query = useNotifications(true, 30_000);
  return {
    count: query.data?.length ?? 0,
    isLoading: query.isLoading,
  };
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      void queryClient.invalidateQueries({ queryKey: ["notifications", "summary"] });
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
      void queryClient.invalidateQueries({ queryKey: ["notifications", "summary"] });
      toast.success("All notifications marked read");
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });
}
