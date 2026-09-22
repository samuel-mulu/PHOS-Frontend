"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { normalizeApiError } from "@/lib/api/errors";
import { fetchTriage, recordTriage } from "./api";
import type { TriageFormValues } from "./schemas";

export function useTriage(encounterId: string) {
  return useQuery({
    queryKey: ["triage", encounterId],
    queryFn: () => fetchTriage(encounterId),
    enabled: Boolean(encounterId),
    retry: (count, error) => {
      if (isAxiosError(error) && error.response?.status === 404) return false;
      return count < 1;
    },
  });
}

export function useRecordTriage(encounterId: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: TriageFormValues) => recordTriage(encounterId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["queues"] });
      void queryClient.invalidateQueries({ queryKey: ["encounters", encounterId] });
      toast.success("Triage completed — patient sent to doctor queue");
      router.push("/nurse");
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });
}
