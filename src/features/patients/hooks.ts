"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { normalizeApiError } from "@/lib/api/errors";
import type { PatientDuplicateMatch } from "@/types/patient";
import {
  createPatient,
  fetchPatient,
  fetchPatients,
  type PatientListParams,
} from "./api";
import type { CreatePatientFormValues } from "./schemas";

export const patientsQueryKey = (params: PatientListParams) =>
  ["patients", params] as const;

export function usePatientsList(params: PatientListParams, enabled = true) {
  return useQuery({
    queryKey: patientsQueryKey(params),
    queryFn: () => fetchPatients(params),
    enabled,
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ["patients", id],
    queryFn: () => fetchPatient(id),
    enabled: Boolean(id),
  });
}

export type DuplicateConflict = {
  message: string;
  matches: PatientDuplicateMatch[];
};

export function parseDuplicateConflict(error: unknown): DuplicateConflict | null {
  if (!isAxiosError(error) || error.response?.status !== 409) return null;
  const details = error.response.data?.details as
    | { message?: string; matches?: PatientDuplicateMatch[] }
    | undefined;
  if (!details?.matches?.length) return null;
  return {
    message: details.message ?? "Possible duplicate patient",
    matches: details.matches,
  };
}

export function useCreatePatient() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CreatePatientFormValues) => createPatient(values),
    onSuccess: (patient) => {
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient registered");
      router.push(`/patients/${patient.id}`);
    },
    onError: (error) => {
      const duplicate = parseDuplicateConflict(error);
      if (duplicate) return;
      toast.error(normalizeApiError(error).message);
    },
  });
}
