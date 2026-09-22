"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { normalizeApiError } from "@/lib/api/errors";
import {
  adjustStock,
  fetchExpiring,
  fetchLowStock,
  fetchStock,
  receiveStock,
} from "./api";

export function useStock() {
  return useQuery({
    queryKey: ["inventory", "stock"],
    queryFn: fetchStock,
  });
}

export function useLowStock() {
  return useQuery({
    queryKey: ["inventory", "low-stock"],
    queryFn: fetchLowStock,
  });
}

export function useExpiring() {
  return useQuery({
    queryKey: ["inventory", "expiring"],
    queryFn: fetchExpiring,
  });
}

export function useReceiveStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: receiveStock,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Stock received");
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adjustStock,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Stock adjusted");
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });
}

export function medicineAvailableQty(
  stock: Awaited<ReturnType<typeof fetchStock>> | undefined,
  medicineId: string,
): number {
  const med = stock?.find((m) => m.id === medicineId);
  if (!med) return 0;
  return med.batches.reduce((s, b) => s + b.quantityRemaining, 0);
}
