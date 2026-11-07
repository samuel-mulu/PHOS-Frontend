"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { normalizeApiError } from "@/lib/api/errors";
import {
  createFamilyPlanning,
  fetchFamilyPlanning,
  updateFamilyPlanning,
} from "./api";
import type { FamilyPlanningFormValues } from "./schemas";

function soft404Retry(count: number, error: unknown) {
  if (isAxiosError(error) && error.response?.status === 404) return false;
  return count < 1;
}

export function useFamilyPlanning(patientId: string) {
  return useQuery({
    queryKey: ["family-planning", patientId],
    queryFn: () => fetchFamilyPlanning(patientId),
    enabled: Boolean(patientId),
    retry: soft404Retry,
  });
}

export function useCreateFamilyPlanning(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: FamilyPlanningFormValues) =>
      createFamilyPlanning(patientId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["family-planning", patientId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["patients", patientId, "chart"],
      });
      toast.success("Family planning record saved");
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });
}

export function useUpdateFamilyPlanning(patientId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: FamilyPlanningFormValues;
    }) => updateFamilyPlanning(id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["family-planning", patientId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["patients", patientId, "chart"],
      });
      toast.success("Family planning record updated");
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });
}
