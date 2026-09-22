"use client";

import { format } from "date-fns";
import type { UseQueryResult } from "@tanstack/react-query";
import { useNetworkStatus } from "@/lib/network/use-network-status";

export function QueryStaleBanner<T>({
  query,
}: {
  query: Pick<
    UseQueryResult<T>,
    "isFetching" | "isError" | "dataUpdatedAt" | "fetchStatus"
  >;
}) {
  const { browserOffline, apiUnreachable } = useNetworkStatus();

  if (!browserOffline && !apiUnreachable) return null;
  if (query.isError && query.fetchStatus === "idle") return null;

  const updated =
    query.dataUpdatedAt > 0
      ? format(new Date(query.dataUpdatedAt), "HH:mm")
      : null;

  let message = "Network unavailable — data may be outdated.";
  if (browserOffline) {
    message = updated
      ? `Offline — showing last loaded data from ${updated}. Changes cannot be submitted.`
      : "Offline — changes cannot be submitted.";
  } else if (apiUnreachable) {
    message = updated
      ? `Server unavailable — showing last loaded data from ${updated}. Safe to retry loading.`
      : "Server unavailable — retry loading when the connection returns.";
  }

  return (
    <div
      role="status"
      className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
    >
      {message}
    </div>
  );
}
