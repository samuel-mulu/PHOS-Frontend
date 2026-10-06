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
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      void queryClient.invalidateQueries({ queryKey: ["queues"] });
      void queryClient.invalidateQueries({ queryKey: ["encounters"] });
      toast.success(
        variables.sendToPharmacy
          ? "Saved and sent to pharmacy"
          : "Prescription saved — send from Finish when ready",
      );
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });
}
