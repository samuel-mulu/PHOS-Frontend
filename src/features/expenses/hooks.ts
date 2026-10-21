"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { classifyMutationError } from "@/lib/api/errors";
import type { PaymentMethod } from "@/types/finance";
import {
  createExpense,
  fetchExpenseCategories,
  fetchExpenses,
  voidExpense,
} from "./api";

export function useExpenseCategories() {
  return useQuery({
    queryKey: ["expenses", "categories"],
    queryFn: fetchExpenseCategories,
    staleTime: 60_000,
  });
}

export function useExpenses(from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: ["expenses", "list", from, to],
    queryFn: () => fetchExpenses(from, to),
    enabled: enabled && Boolean(from && to),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      categoryId: string;
      amountCents: number;
      expenseDate: string;
      method: PaymentMethod;
      vendor?: string;
      description?: string;
      receiptReference?: string;
    }) => createExpense(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense recorded");
    },
    onError: (e) => {
      const { message } = classifyMutationError(e);
      toast.error(message);
    },
  });
}

export function useVoidExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      voidExpense(id, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense voided");
    },
    onError: (e) => {
      const { message } = classifyMutationError(e);
      toast.error(message);
    },
  });
}
