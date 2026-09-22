"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchOperationalSnapshot } from "./api";

export function useOperationalSnapshot() {
  return useQuery({
    queryKey: ["reports", "operational-snapshot"],
    queryFn: fetchOperationalSnapshot,
    staleTime: 60_000,
  });
}
