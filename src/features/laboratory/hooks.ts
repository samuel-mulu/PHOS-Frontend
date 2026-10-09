"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { normalizeApiError } from "@/lib/api/errors";
import type { LabOrderStatus } from "@/types/lab";
import {
  createLabOrder,
  createLabTest,
  enterLabResults,
  fetchAdminLabTests,
  fetchLabOrder,
  fetchLabOrders,
  fetchLabTests,
  receiveLabOrder,
  setLabTestActive,
  updateLabTest,
  verifyLabOrder,
  type ResultValueInput,
} from "./api";

export function useLabTests() {
  return useQuery({ queryKey: ["lab", "tests"], queryFn: fetchLabTests });
}

export function useAdminLabTests() {
  return useQuery({
    queryKey: ["lab", "tests", "admin"],
    queryFn: fetchAdminLabTests,
  });
}

function invalidateLabCatalog(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["lab", "tests"] });
}

export function useCreateLabTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLabTest,
    onSuccess: () => {
      invalidateLabCatalog(queryClient);
      toast.success("Lab test added");
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });
}

export function useUpdateLabTest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      category?: string;
      unit?: string;
      referenceRange?: string;
      priceCents?: number;
      sortOrder?: number;
      active?: boolean;
    }) => updateLabTest(id, body),
    onSuccess: () => {
      invalidateLabCatalog(queryClient);
      toast.success("Lab test updated");
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });
}

export function useSetLabTestActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      setLabTestActive(id, active),
    onSuccess: (_d, vars) => {
      invalidateLabCatalog(queryClient);
      toast.success(vars.active ? "Test enabled" : "Test disabled");
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });
}

export function useLabOrders(status?: LabOrderStatus) {
  return useQuery({
    queryKey: ["lab", "orders", status ?? "all"],
    queryFn: () => fetchLabOrders(status),
    refetchInterval: 8_000,
  });
}

export function useLabOrder(id: string) {
  return useQuery({
    queryKey: ["lab", "orders", id],
    queryFn: () => fetchLabOrder(id),
    enabled: Boolean(id),
  });
}

export function useReceiveLabOrder(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => receiveLabOrder(orderId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["lab", "orders"] });
      toast.success("Sample marked as received");
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
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
      void queryClient.invalidateQueries({ queryKey: ["queues"] });
      void queryClient.invalidateQueries({ queryKey: ["encounters"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Verified and sent to doctor queue");
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
