"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { normalizeApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/stores/auth-store";
import { Role } from "@/types/role";
import { fetchTriage, recordTriage } from "./api";
import type { TriageFormValues } from "./schemas";

const DESK_TRIAGE_ROLES: string[] = [
  Role.FRONT_DESK,
  Role.RECEPTIONIST,
  Role.CASHIER,
];

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
  const role = useAuthStore((s) => s.user?.role);
  return useMutation({
    mutationFn: (values: TriageFormValues) => recordTriage(encounterId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["queues"] });
      void queryClient.invalidateQueries({ queryKey: ["encounters", encounterId] });
      toast.success("Triage saved — patient sent to doctor queue");
      if (role && DESK_TRIAGE_ROLES.includes(role)) {
        router.push("/front-desk?tab=reception");
      } else {
        router.push("/nurse");
      }
    },
    onError: (error) => toast.error(normalizeApiError(error).message),
  });
}
