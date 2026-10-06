"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { normalizeApiError } from "@/lib/api/errors";
import {
  addDiagnosis,
  fetchConsultationByEncounter,
  finalizeConsultation,
  saveConsultation,
} from "./api";
import type { ConsultationFormValues, DiagnosisFormValues } from "./schemas";

export function useConsultation(encounterId: string) {
  return useQuery({
    queryKey: ["consultation", encounterId],
    queryFn: () => fetchConsultationByEncounter(encounterId),
    enabled: Boolean(encounterId),
  });
}

export function useSaveConsultation(encounterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: ConsultationFormValues) =>
      saveConsultation(encounterId, values),
    onSuccess: (data) => {
      void queryClient.setQueryData(["consultation", encounterId], data);
      void queryClient.invalidateQueries({ queryKey: ["encounters", encounterId] });
      toast.success("Consultation saved");
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });
}

export function useAddDiagnosis(consultationId: string, encounterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: DiagnosisFormValues) =>
      addDiagnosis(consultationId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["consultation", encounterId] });
      toast.success("Diagnosis added");
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });
}

export function useFinalizeConsultation(
  consultationId: string,
  encounterId: string,
  options?: { redirect?: boolean },
) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const redirect = options?.redirect !== false;
  return useMutation({
    mutationFn: () => finalizeConsultation(consultationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["consultation", encounterId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["encounters", encounterId],
      });
      void queryClient.invalidateQueries({ queryKey: ["queues"] });
      void queryClient.invalidateQueries({ queryKey: ["encounters"] });
      toast.success("Consultation completed — patient left your queue");
      if (redirect) router.push("/doctor");
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });
}
