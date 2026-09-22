"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueueStation } from "@/types/encounter";
import { fetchQueue, updateQueueEntry } from "./api";

export function useQueue(station: QueueStation, refetchInterval = 15_000) {
  return useQuery({
    queryKey: ["queues", station],
    queryFn: () => fetchQueue(station),
    refetchInterval,
  });
}

export function useUpdateQueueEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: string;
      station?: QueueStation;
    }) => updateQueueEntry(id, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["queues"] });
    },
  });
}
