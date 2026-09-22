import { isAxiosError } from "axios";
import { api } from "@/lib/api/client";

export type CashSession = {
  id: string;
  status: string;
  openingFloatCents: number;
  expectedCashCents: number | null;
  actualCashCents: number | null;
  differenceCents: number | null;
  openedAt: string;
  closedAt: string | null;
  notes: string | null;
  payments?: Array<{ id: string; amountCents: number; method: string }>;
};

export async function openCashSession(openingFloatCents: number) {
  const { data } = await api.post<CashSession>("/cash-sessions/open", {
    openingFloatCents,
  });
  return data;
}

export async function fetchCurrentCashSession() {
  try {
    const { data } = await api.get<CashSession>("/cash-sessions/current");
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

export async function closeCashSession(
  id: string,
  body: { actualCashCents: number; notes?: string },
) {
  const { data } = await api.post<CashSession>(`/cash-sessions/${id}/close`, body);
  return data;
}
