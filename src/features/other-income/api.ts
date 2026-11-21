import { api } from "@/lib/api/client";
import type { PaymentMethod } from "@/types/finance";

export type OtherIncomeSource = {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  active: boolean;
};

export type OtherIncomeRow = {
  id: string;
  incomeNumber: string;
  incomeDate: string;
  amountCents: number;
  paymentMethod: PaymentMethod | string;
  payer: string | null;
  notes: string | null;
  receiptReference: string | null;
  status: string;
  voidReason?: string | null;
  source: OtherIncomeSource;
  recordedBy: { id: string; firstName: string; lastName: string };
  voidedBy?: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
};

export type CreateOtherIncomeBody = {
  sourceId?: string;
  newSourceName?: string;
  amountCents: number;
  incomeDate: string;
  method: PaymentMethod;
  payer?: string;
  notes?: string;
  receiptReference?: string;
};

export async function fetchOtherIncomeSources() {
  const { data } = await api.get<OtherIncomeSource[]>("/other-income/sources");
  return data;
}

export async function fetchOtherIncomes(
  from: string,
  to: string,
  status = "RECORDED",
) {
  const { data } = await api.get<OtherIncomeRow[]>("/other-income", {
    params: { from, to, status },
  });
  return data;
}

export async function createOtherIncome(body: CreateOtherIncomeBody) {
  const { data } = await api.post<OtherIncomeRow>("/other-income", body);
  return data;
}

export async function voidOtherIncome(id: string, reason: string) {
  const { data } = await api.post<OtherIncomeRow>(`/other-income/${id}/void`, {
    reason,
  });
  return data;
}
