"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { notificationsQueryKey } from "@/features/notifications/hooks";

const POLL_MS = 45_000;

/**
 * REST-first operational sync. Backend Socket.IO is not wired yet; this
 * invalidates canonical queries on an interval while the tab is visible.
 */
export function useOperationalSync() {
  const queryClient = useQueryClient();
  const lastRun = useRef(0);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRun.current < POLL_MS) return;
      lastRun.current = now;
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      void queryClient.invalidateQueries({ queryKey: ["queues"] });
    };

    const onVisible = () => {
      lastRun.current = 0;
      tick();
    };

    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [queryClient]);
}
