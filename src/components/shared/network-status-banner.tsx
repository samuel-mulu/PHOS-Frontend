"use client";

import { useNetworkStatus } from "@/lib/network/use-network-status";

export function NetworkStatusBanner() {
  const { browserOffline, apiUnreachable } = useNetworkStatus();

  if (!browserOffline && !apiUnreachable) return null;

  const message = browserOffline
    ? "Offline — changes cannot be submitted."
    : "Server unavailable — retrying is safe for read-only actions.";

  return (
    <div
      role="alert"
      className="border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-sm text-amber-950"
    >
      {message}
    </div>
  );
}
