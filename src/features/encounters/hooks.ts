"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { normalizeApiError } from "@/lib/api/errors";
import { isAxiosError } from "axios";
import {
  createEncounter,
  fetchEncounter,
  type CreateEncounterInput,
} from "./api";

export function useEncounter(id: string) {
  return useQuery({
    queryKey: ["encounters", id],
    queryFn: () => fetchEncounter(id),
    enabled: Boolean(id),
  });
}

export function useCreateEncounter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEncounterInput) => createEncounter(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["queues"] });
      toast.success("Visit started — patient sent to triage queue");
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
