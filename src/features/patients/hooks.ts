"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { normalizeApiError } from "@/lib/api/errors";
import type { Patient, PatientDuplicateMatch } from "@/types/patient";
import {
  createPatient,
  fetchPatient,
  fetchPatientChart,
  fetchPatients,
  lookupPatientByNumber,
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

export function usePatientChart(id: string) {
  return useQuery({
    queryKey: ["patients", id, "chart"],
    queryFn: () => fetchPatientChart(id),
    enabled: Boolean(id),
  });
}

export function usePatientLookup() {
  return useMutation({
    mutationFn: (patientNumber: string) =>
      lookupPatientByNumber(patientNumber.trim()),
    onError: (error) => toast.error(normalizeApiError(error).message),
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

export type UseCreatePatientOptions = {
  /** When false, stay on current page (e.g. front desk modal). Default true. */
  redirectToProfile?: boolean;
  /** Called after successful registration (before optional redirect). */
  onRegistered?: (patient: Patient) => void;
};

export function useCreatePatient(options: UseCreatePatientOptions = {}) {
  const { redirectToProfile = true, onRegistered } = options;
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CreatePatientFormValues) => createPatient(values),
    onSuccess: (patient) => {
      void queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient registered");
      onRegistered?.(patient);
      if (redirectToProfile) {
        router.push(`/patients/${patient.id}`);
      }
    },
    onError: (error) => {
      const duplicate = parseDuplicateConflict(error);
      if (duplicate) return;
      toast.error(normalizeApiError(error).message);
    },
  });
}
