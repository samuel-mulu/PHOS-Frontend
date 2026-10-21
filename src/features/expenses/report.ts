import { api } from "@/lib/api/client";
import type { PaymentMethod } from "@/types/finance";

export type ExpenseReportRow = {
  id: string;
  expenseNumber: string;
  expenseDate: string;
  createdAt: string;
  status: string;
  amountCents: number;
  method: PaymentMethod | string;
  vendor: string | null;
  description: string | null;
  receiptReference: string | null;
  voidReason: string | null;
  category: { id: string; code: string; name: string };
  recordedBy: { id: string; firstName: string; lastName: string };
  voidedBy: { id: string; firstName: string; lastName: string } | null;
};

export type ExpenseReport = {
  period: { from: string; to: string };
  totals: {
    count: number;
    amountCents: number;
    voidedCount: number;
    voidedCents: number;
    byCategory: Array<{
      categoryId: string;
      code: string;
      name: string;
      count: number;
      amountCents: number;
    }>;
  };
  rows: ExpenseReportRow[];
};

export async function fetchExpenseReport(from: string, to: string) {
  const { data } = await api.get<ExpenseReport>("/expenses/report", {
    params: { from, to },
  });
  return data;
}

export function expenseReportToCsv(report: ExpenseReport): string {
  const header = [
    "Date",
    "Expense #",
    "Category",
    "Status",
    "Amount (ETB)",
    "Method",
    "Vendor",
    "Description",
    "Receipt ref",
    "Recorded by",
    "Void reason",
  ];
  const lines = report.rows.map((r) => {
    const recorded = `${r.recordedBy.firstName} ${r.recordedBy.lastName}`;
    return [
      r.expenseDate,
      r.expenseNumber,
      r.category.name,
      r.status,
      (r.amountCents / 100).toFixed(2),
      r.method,
      r.vendor ?? "",
      r.description ?? "",
      r.receiptReference ?? "",
      recorded,
      r.voidReason ?? "",
    ]
      .map((v) => `"${String(v).replaceAll('"', '""')}"`)
      .join(",");
  });
  return [header.join(","), ...lines].join("\n");
}
