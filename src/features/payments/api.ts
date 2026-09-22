import { api } from "@/lib/api/client";
import type { PaymentMethod } from "@/types/finance";

export type Payment = {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  amountCents: number;
  refundedCents: number;
  method: PaymentMethod;
  status: string;
  referenceNumber: string | null;
};

export async function createPayment(body: {
  idempotencyKey: string;
  invoiceId: string;
  amountCents: number;
  method: PaymentMethod;
  referenceNumber?: string;
  cashSessionId?: string;
}) {
  const { data } = await api.post<Payment>("/payments", body);
  return data;
}

export async function fetchPayment(id: string) {
  const { data } = await api.get<Payment & { invoice: { id: string }; refunds: unknown[] }>(
    `/payments/${id}`,
  );
  return data;
}

export async function createRefund(
  paymentId: string,
  body: { idempotencyKey: string; amountCents: number; reason: string },
) {
  const { data } = await api.post(`/payments/${paymentId}/refunds`, body);
  return data;
}
