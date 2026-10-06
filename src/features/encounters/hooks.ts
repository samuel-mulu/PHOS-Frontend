"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { normalizeApiError } from "@/lib/api/errors";
import { isAxiosError } from "axios";
import {
  createEncounter,
  fetchEncounter,
  fetchEncounters,
  requestBilling,
  routeEncounter,
  type CreateEncounterInput,
} from "./api";

export function useEncounter(id: string) {
  return useQuery({
    queryKey: ["encounters", id],
    queryFn: () => fetchEncounter(id),
    enabled: Boolean(id),
  });
}

export function useEncounters(params?: { status?: string; patientId?: string }) {
  return useQuery({
    queryKey: ["encounters", "list", params?.status ?? "all", params?.patientId ?? ""],
    queryFn: () => fetchEncounters(params),
    refetchInterval: params?.status === "WAITING_REVIEW" ? 8_000 : 20_000,
  });
}

export function useRequestBilling(encounterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => requestBilling(encounterId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["queues"] });
      void queryClient.invalidateQueries({
        queryKey: ["encounters", encounterId],
      });
      toast.success("Patient sent to cashier");
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });
}

export function useRouteEncounter(encounterId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      station: "TRIAGE" | "DOCTOR" | "LAB" | "PHARMACY" | "CASHIER",
    ) => routeEncounter(encounterId, station),
    onSuccess: (_data, station) => {
      void queryClient.invalidateQueries({ queryKey: ["queues"] });
      void queryClient.invalidateQueries({
        queryKey: ["encounters", encounterId],
      });
      const labels: Record<string, string> = {
        TRIAGE: "triage",
        DOCTOR: "doctor",
        LAB: "lab",
        PHARMACY: "pharmacy",
        CASHIER: "cashier",
      };
      toast.success(`Patient sent to ${labels[station] ?? station}`);
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });
}

export function useCreateEncounter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEncounterInput) => createEncounter(input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["queues"] });
      const dest =
        variables.initialStation === "TRIAGE" ? "triage" : "doctor";
      toast.success(`Visit started — patient sent to ${dest}`);
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 409) {
        const body = error.response.data?.details as { message?: string };
        toast.error(body?.message ?? "Patient already has an active visit");
        return;
      }
      toast.error(normalizeApiError(error).message);
    },
  });
}
