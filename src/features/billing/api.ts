import { api } from "@/lib/api/client";
import type { InvoiceItemType } from "@/types/finance";
import type { Patient } from "@/types/patient";

export type InvoiceItem = {
  id: string;
  type: InvoiceItemType;
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  encounterId: string;
  patientId: string;
  status: string;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  paidCents: number;
  /** Forgiven (free) - not owed. */
  waivedCents: number;
  /** Approved pay later - owed as debt. */
  deferredCents: number;
  issuedAt: string | null;
  patient: Patient;
  encounter: { id: string; encounterNumber: string; status: string };
  items: InvoiceItem[];
  payments: Array<{
    id: string;
    paymentNumber: string;
    amountCents: number;
    refundedCents: number;
    method: string;
    status: string;
    refunds: Array<{ id: string; refundNumber: string; amountCents: number; reason: string }>;
  }>;
};

export type AdditionalInvoiceItem = {
  type: "PROCEDURE" | "OTHER";
  description: string;
  quantity?: number;
  unitPriceCents: number;
};

export async function createInvoice(
  encounterId: string,
  body: { additionalItems?: AdditionalInvoiceItem[]; discountCents?: number },
) {
  const { data } = await api.post<Invoice>(
    `/encounters/${encounterId}/invoice`,
    body,
  );
  return data;
}

export async function fetchInvoice(id: string) {
  const { data } = await api.get<Invoice>(`/invoices/${id}`);
  return data;
}

export async function issueInvoice(id: string) {
  const { data } = await api.post<Invoice>(`/invoices/${id}/issue`);
  return data;
}

export async function voidInvoice(id: string) {
  const { data } = await api.post<Invoice>(`/invoices/${id}/void`);
  return data;
}

export async function deferInvoice(
  id: string,
  body: { idempotencyKey: string; reason: string },
) {
  const { data } = await api.post(`/invoices/${id}/defer`, body);
  return data;
}

export async function waiveInvoice(
  id: string,
  body: { idempotencyKey: string; amountCents: number; reason: string },
) {
  const { data } = await api.post(`/invoices/${id}/waive`, body);
  return data;
}
