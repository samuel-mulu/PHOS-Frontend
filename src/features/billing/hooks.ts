"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { normalizeApiError } from "@/lib/api/errors";
import {
  createInvoice,
  fetchInvoice,
  issueInvoice,
  voidInvoice,
  type AdditionalInvoiceItem,
} from "./api";

export function useInvoice(id: string | null) {
  return useQuery({
    queryKey: ["invoices", id],
    queryFn: () => fetchInvoice(id!),
    enabled: Boolean(id),
  });
}

export type UseCreateInvoiceOptions = {
  redirectToInvoice?: boolean;
  onCreated?: (invoice: import("./api").Invoice) => void;
};

export function useCreateInvoice(options: UseCreateInvoiceOptions = {}) {
  const { redirectToInvoice = true, onCreated } = options;
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      encounterId,
      additionalItems,
      discountCents,
    }: {
      encounterId: string;
      additionalItems?: AdditionalInvoiceItem[];
      discountCents?: number;
    }) => createInvoice(encounterId, { additionalItems, discountCents }),
    onSuccess: (invoice) => {
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      void queryClient.invalidateQueries({ queryKey: ["encounters"] });
      toast.success("Invoice created (draft)");
      onCreated?.(invoice);
      if (redirectToInvoice) {
        router.push(`/billing/invoices/${invoice.id}`);
      }
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });
}

export function useIssueInvoice(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => issueInvoice(invoiceId),
    onSuccess: (data) => {
      void queryClient.setQueryData(["invoices", invoiceId], data);
      toast.success("Invoice issued — ready for payment");
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });
}

export function useVoidInvoice(invoiceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => voidInvoice(invoiceId),
    onSuccess: (data) => {
      void queryClient.setQueryData(["invoices", invoiceId], data);
      toast.success("Invoice voided");
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });
}
