"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { classifyMutationError } from "@/lib/api/errors";
import {
  createOtherIncome,
  fetchOtherIncomeSources,
  fetchOtherIncomes,
  voidOtherIncome,
  type CreateOtherIncomeBody,
} from "./api";

export function useOtherIncomeSources() {
  return useQuery({
    queryKey: ["other-income", "sources"],
    queryFn: fetchOtherIncomeSources,
    staleTime: 60_000,
  });
}

export function useOtherIncomes(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: ["other-income", "list", from, to],
    queryFn: () => fetchOtherIncomes(from, to),
    enabled: enabled && Boolean(from && to),
  });
}

export function useCreateOtherIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateOtherIncomeBody) => createOtherIncome(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["other-income"] });
      toast.success("Income recorded");
    },
    onError: (e) => {
      const { message } = classifyMutationError(e);
      toast.error(message);
    },
  });
}

export function useVoidOtherIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      voidOtherIncome(id, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["other-income"] });
      toast.success("Income voided");
    },
    onError: (e) => {
      const { message } = classifyMutationError(e);
      toast.error(message);
    },
  });
}
