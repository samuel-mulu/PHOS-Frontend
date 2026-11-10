"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { normalizeApiError } from "@/lib/api/errors";
import {
  createClinicalMessage,
  fetchEncounterClinicalMessages,
  fetchPatientClinicalMessages,
} from "./api";
import type { ClinicalMessageKind } from "./types";

function soft404Retry(count: number, error: unknown) {
  if (isAxiosError(error) && error.response?.status === 404) return false;
  return count < 1;
}

export function useEncounterClinicalMessages(encounterId: string) {
  return useQuery({
    queryKey: ["clinical-messages", "encounter", encounterId],
    queryFn: () => fetchEncounterClinicalMessages(encounterId),
    enabled: Boolean(encounterId),
    refetchInterval: 8_000,
    retry: soft404Retry,
  });
}

export function usePatientClinicalMessages(patientId: string) {
  return useQuery({
    queryKey: ["clinical-messages", "patient", patientId],
    queryFn: () => fetchPatientClinicalMessages(patientId),
    enabled: Boolean(patientId),
    retry: soft404Retry,
  });
}

export function useCreateClinicalMessage(encounterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      body: string;
      kind?: ClinicalMessageKind;
      labOrderId?: string;
    }) => createClinicalMessage(encounterId, payload),
    onSuccess: (message) => {
      void queryClient.invalidateQueries({
        queryKey: ["clinical-messages", "encounter", encounterId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["clinical-messages", "patient", message.patientId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["patients", message.patientId, "chart"],
      });
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });
}
