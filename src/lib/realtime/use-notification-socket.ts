"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import type { Notification } from "@/features/notifications/api";
import {
  notificationsQueryKey,
  notificationSummaryQueryKey,
} from "@/features/notifications/hooks";
import { useAuthStore } from "@/stores/auth-store";
import { usePreferencesStore } from "@/stores/preferences-store";
import { playNotifySound } from "./notify-sound";
import { notificationSocketUrl } from "./socket-url";

/**
 * Live notification channel. Invalidates React Query caches and (when enabled
 * in Settings) plays a sound + toast on `notification:new`.
 */
export function useNotificationSocket() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!hasHydrated || !accessToken) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const socket = io(`${notificationSocketUrl()}/notifications`, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 8_000,
    });
    socketRef.current = socket;

    socket.on("notification:new", (payload: Notification) => {
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      void queryClient.invalidateQueries({
        queryKey: notificationSummaryQueryKey,
      });
      void queryClient.invalidateQueries({ queryKey: ["queues"] });

      if (usePreferencesStore.getState().notificationAlertsEnabled) {
        playNotifySound();
        toast.message(payload.title, {
          description: payload.message,
          duration: 5_000,
        });
      }
    });

    socket.on("notification:count", (payload: { total: number }) => {
      queryClient.setQueryData(notificationSummaryQueryKey, (prev: unknown) => {
        if (
          prev &&
          typeof prev === "object" &&
          "total" in prev &&
          "byPriority" in prev
        ) {
          return { ...prev, total: payload.total };
        }
        return {
          total: payload.total,
          byPriority: { CRITICAL: 0, HIGH: 0, NORMAL: 0 },
        };
      });
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [accessToken, hasHydrated, queryClient]);
}
