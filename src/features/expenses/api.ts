import { api } from "@/lib/api/client";
import type { PaymentMethod } from "@/types/finance";

export type ExpenseCategory = {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  active: boolean;
};

export type ExpenseRow = {
  id: string;
  expenseNumber: string;
  expenseDate: string;
  amountCents: number;
  paymentMethod: PaymentMethod | string;
  vendor: string | null;
  description: string | null;
  receiptReference: string | null;
  status: string;
  voidReason?: string | null;
  category: ExpenseCategory;
  recordedBy: { id: string; firstName: string; lastName: string };
  voidedBy?: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
};

export async function fetchExpenseCategories() {
  const { data } = await api.get<ExpenseCategory[]>("/expenses/categories");
  return data;
}

export async function fetchExpenses(from: string, to: string, status = "RECORDED") {
  const { data } = await api.get<ExpenseRow[]>("/expenses", {
    params: { from, to, status },
  });
  return data;
}

export async function createExpense(body: {
  categoryId: string;
  amountCents: number;
  expenseDate: string;
  method: PaymentMethod;
  vendor?: string;
  description?: string;
  receiptReference?: string;
}) {
  const { data } = await api.post<ExpenseRow>("/expenses", body);
  return data;
}

export async function voidExpense(id: string, reason: string) {
  const { data } = await api.post<ExpenseRow>(`/expenses/${id}/void`, {
    reason,
  });
  return data;
}
