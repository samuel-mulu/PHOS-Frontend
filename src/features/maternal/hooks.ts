"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { normalizeApiError } from "@/lib/api/errors";
import {
  addLaborMonitoring,
  createAncVisit,
  fetchAncVisits,
  fetchDelivery,
  fetchLabor,
  fetchPatientMaternal,
  updateAncVisit,
  upsertDelivery,
  upsertLabor,
  upsertObstetricHistory,
} from "./api";
import type {
  AncVisitFormValues,
  DeliveryFormValues,
  LaborAdmissionFormValues,
  LaborMonitoringFormValues,
  ObstetricHistoryFormValues,
} from "./schemas";

function soft404Retry(count: number, error: unknown) {
  if (isAxiosError(error) && error.response?.status === 404) return false;
  return count < 1;
}

export function usePatientMaternal(patientId: string) {
  return useQuery({
    queryKey: ["maternal", patientId],
    queryFn: () => fetchPatientMaternal(patientId),
    enabled: Boolean(patientId),
    retry: soft404Retry,
  });
}

export function useUpsertObstetricHistory(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: ObstetricHistoryFormValues) =>
      upsertObstetricHistory(patientId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["maternal", patientId] });
      void queryClient.invalidateQueries({
        queryKey: ["patients", patientId, "chart"],
      });
      toast.success("Obstetric history saved");
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });
}

export function useAncVisits(patientId: string) {
  return useQuery({
    queryKey: ["anc-visits", patientId],
    queryFn: () => fetchAncVisits(patientId),
    enabled: Boolean(patientId),
    retry: soft404Retry,
  });
}

export function useCreateAncVisit(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: AncVisitFormValues) =>
      createAncVisit(patientId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["anc-visits", patientId] });
      void queryClient.invalidateQueries({ queryKey: ["maternal", patientId] });
      void queryClient.invalidateQueries({
        queryKey: ["patients", patientId, "chart"],
      });
      toast.success("ANC visit added");
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });
}

export function useUpdateAncVisit(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: AncVisitFormValues }) =>
      updateAncVisit(id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["anc-visits", patientId] });
      void queryClient.invalidateQueries({ queryKey: ["maternal", patientId] });
      toast.success("ANC visit updated");
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });
}

export function useLabor(encounterId: string) {
  return useQuery({
    queryKey: ["labor", encounterId],
    queryFn: () => fetchLabor(encounterId),
    enabled: Boolean(encounterId),
    retry: soft404Retry,
  });
}

export function useUpsertLabor(encounterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: LaborAdmissionFormValues) =>
      upsertLabor(encounterId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["labor", encounterId] });
      toast.success("Labor admission saved");
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });
}

export function useAddLaborMonitoring(encounterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: LaborMonitoringFormValues) =>
      addLaborMonitoring(encounterId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["labor", encounterId] });
      toast.success("Monitoring entry added");
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });
}

export function useDelivery(encounterId: string) {
  return useQuery({
    queryKey: ["delivery", encounterId],
    queryFn: () => fetchDelivery(encounterId),
    enabled: Boolean(encounterId),
    retry: soft404Retry,
  });
}

export function useUpsertDelivery(encounterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: DeliveryFormValues) =>
      upsertDelivery(encounterId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["delivery", encounterId],
      });
      toast.success("Delivery summary saved");
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });
}
