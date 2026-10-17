"use client";

import { useCallback, useState } from "react";
import {
  readStoredDateSort,
  storeDateSort,
  type DateSortDirection,
} from "@/lib/queues/sort";

/** Shared Latest / Oldest preference (persisted). Default: latest. */
export function useDateSort(defaultDirection: DateSortDirection = "latest") {
  const [direction, setDirectionState] = useState<DateSortDirection>(() =>
    readStoredDateSort(defaultDirection),
  );

  const setDirection = useCallback((next: DateSortDirection) => {
    setDirectionState(next);
    storeDateSort(next);
  }, []);

  return { direction, setDirection } as const;
}
