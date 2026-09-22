"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { normalizeApiError } from "@/lib/api/errors";
import {
  createPrescription,
  fetchPrescription,
  fetchPrescriptions,
  fetchMedicines,
} from "./api";

export function useMedicines() {
  return useQuery({ queryKey: ["medicines"], queryFn: fetchMedicines });
}

export function usePrescriptions(status?: string) {
  return useQuery({
    queryKey: ["prescriptions", status ?? "all"],
    queryFn: () => fetchPrescriptions(status),
    refetchInterval: 20_000,
  });
}

export function usePrescription(id: string) {
  return useQuery({
    queryKey: ["prescriptions", id],
    queryFn: () => fetchPrescription(id),
    enabled: Boolean(id),
  });
}

export function useCreatePrescription(consultationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof createPrescription>[1]) =>
      createPrescription(consultationId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      toast.success("Prescription created");
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });
}
