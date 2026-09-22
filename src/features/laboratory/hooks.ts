"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { normalizeApiError } from "@/lib/api/errors";
import type { LabOrderStatus } from "@/types/lab";
import {
  enterLabResults,
  fetchLabOrder,
  fetchLabOrders,
  fetchLabTests,
  verifyLabOrder,
  type ResultValueInput,
} from "./api";
import { createLabOrder } from "./api";

export function useLabTests() {
  return useQuery({ queryKey: ["lab", "tests"], queryFn: fetchLabTests });
}

export function useLabOrders(status?: LabOrderStatus) {
  return useQuery({
    queryKey: ["lab", "orders", status ?? "all"],
    queryFn: () => fetchLabOrders(status),
    refetchInterval: 20_000,
  });
}

export function useLabOrder(id: string) {
  return useQuery({
    queryKey: ["lab", "orders", id],
    queryFn: () => fetchLabOrder(id),
    enabled: Boolean(id),
  });
}

export function useEnterLabResults(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (results: ResultValueInput[]) =>
      enterLabResults(orderId, results),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lab", "orders"] });
      toast.success("Results saved");
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });
}

export function useVerifyLabOrder(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => verifyLabOrder(orderId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lab", "orders"] });
      toast.success("Order verified — doctor can review results");
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });
}

export function useCreateLabOrder(consultationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof createLabOrder>[1]) =>
      createLabOrder(consultationId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lab", "orders"] });
      toast.success("Lab order created");
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });
}
