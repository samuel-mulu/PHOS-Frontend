import { api } from "@/lib/api/client";
import type { PaymentMethod } from "@/types/finance";

export type OtherIncomeReportRow = {
  id: string;
  incomeNumber: string;
  incomeDate: string;
  createdAt: string;
  status: string;
  amountCents: number;
  method: PaymentMethod | string;
  payer: string | null;
  notes: string | null;
  receiptReference: string | null;
  voidReason: string | null;
  source: { id: string; code: string; name: string };
  recordedBy: { id: string; firstName: string; lastName: string };
  voidedBy: { id: string; firstName: string; lastName: string } | null;
};

export type OtherIncomeReport = {
  period: { from: string; to: string };
  totals: {
    count: number;
    amountCents: number;
    voidedCount: number;
    voidedCents: number;
    bySource: Array<{
      sourceId: string;
      code: string;
      name: string;
      count: number;
      amountCents: number;
    }>;
  };
  rows: OtherIncomeReportRow[];
};

export async function fetchOtherIncomeReport(from: string, to: string) {
  const { data } = await api.get<OtherIncomeReport>("/other-income/report", {
    params: { from, to },
  });
  return data;
}

export function otherIncomeReportToCsv(report: OtherIncomeReport): string {
  const header = [
    "Date",
    "Income #",
    "Source",
    "Status",
    "Amount (ETB)",
    "Method",
    "Payer",
    "Reason / notes",
    "Receipt ref",
    "Recorded by",
    "Void reason",
  ];
  const lines = report.rows.map((r) =>
    [
      r.incomeDate,
      r.incomeNumber,
      r.source.name,
      r.status,
      (r.amountCents / 100).toFixed(2),
      r.method,
      r.payer ?? "",
      r.notes ?? "",
      r.receiptReference ?? "",
      `${r.recordedBy.firstName} ${r.recordedBy.lastName}`,
      r.voidReason ?? "",
    ]
      .map((v) => `"${String(v).replaceAll('"', '""')}"`)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}
