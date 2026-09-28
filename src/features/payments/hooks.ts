"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { classifyMutationError, normalizeApiError } from "@/lib/api/errors";
import { newIdempotencyKey } from "@/lib/idempotency";
import type { PaymentMethod } from "@/types/finance";
import { createPayment, createRefund } from "./api";

export function useCreatePayment(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      amountCents: number;
      method: PaymentMethod;
      referenceNumber?: string;
      cashSessionId?: string;
    }) =>
      createPayment({
        idempotencyKey: newIdempotencyKey(),
        invoiceId,
        ...body,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoices", invoiceId] });
      void queryClient.invalidateQueries({ queryKey: ["cash-session"] });
      void queryClient.invalidateQueries({ queryKey: ["encounters"] });
      void queryClient.invalidateQueries({ queryKey: ["reports", "dashboard"] });
      toast.success("Payment recorded");
    },
    onError: (e) => {
      const { message, outcome } = classifyMutationError(e);
      toast.error(message, { duration: outcome === "unknown" ? 8000 : 4000 });
    },
  });
}

export function useCreateRefund(paymentId: string, invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { amountCents: number; reason: string }) =>
      createRefund(paymentId, {
        idempotencyKey: newIdempotencyKey(),
        ...body,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invoices", invoiceId] });
      void queryClient.invalidateQueries({ queryKey: ["cash-session"] });
      toast.success("Refund recorded");
    },
    onError: (e) => {
      const { message, outcome } = classifyMutationError(e);
      toast.error(message, { duration: outcome === "unknown" ? 8000 : 4000 });
    },
  });
}
