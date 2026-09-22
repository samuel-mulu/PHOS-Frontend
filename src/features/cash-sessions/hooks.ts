"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { normalizeApiError } from "@/lib/api/errors";
import {
  closeCashSession,
  fetchCurrentCashSession,
  openCashSession,
} from "./api";

export function useCurrentCashSession() {
  return useQuery({
    queryKey: ["cash-session", "current"],
    queryFn: fetchCurrentCashSession,
    refetchInterval: 30_000,
  });
}

export function useOpenCashSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (openingFloatCents: number) => openCashSession(openingFloatCents),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cash-session"] });
      toast.success("Cash session opened");
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });
}

export function useCloseCashSession(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { actualCashCents: number; notes?: string }) =>
      closeCashSession(sessionId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cash-session"] });
      toast.success("Cash session closed");
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });
}
