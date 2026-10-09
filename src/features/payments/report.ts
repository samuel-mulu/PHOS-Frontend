import { api } from "@/lib/api/client";
import type { PaymentMethod } from "@/types/finance";

export type PaymentReportRow = {
  id: string;
  paymentNumber: string;
  createdAt: string;
  method: PaymentMethod | string;
  status: string;
  amountCents: number;
  refundedCents: number;
  netCents: number;
  referenceNumber: string | null;
  invoice: { id: string; invoiceNumber: string };
  patient: {
    id: string;
    patientNumber: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
  };
  recordedBy: { id: string; firstName: string; lastName: string };
};

export type PaymentReport = {
  period: { from: string; to: string };
  totals: {
    count: number;
    amountCents: number;
    refundedCents: number;
    netCents: number;
    byMethod: Record<string, { count: number; amountCents: number }>;
  };
  rows: PaymentReportRow[];
};

export async function fetchPaymentReport(from: string, to: string) {
  const { data } = await api.get<PaymentReport>("/payments/report", {
    params: { from, to },
  });
  return data;
}

export function paymentReportToCsv(report: PaymentReport): string {
  const header = [
    "Date",
    "Payment #",
    "Invoice #",
    "Patient #",
    "Patient",
    "Method",
    "Status",
    "Amount (ETB)",
    "Refunded (ETB)",
    "Net (ETB)",
    "Reference",
    "Recorded by",
  ];
  const lines = report.rows.map((r) => {
    const name = [r.patient.firstName, r.patient.middleName, r.patient.lastName]
      .filter(Boolean)
      .join(" ");
    const recorded = `${r.recordedBy.firstName} ${r.recordedBy.lastName}`;
    return [
      r.createdAt,
      r.paymentNumber,
      r.invoice.invoiceNumber,
      r.patient.patientNumber,
      name,
      r.method,
      r.status,
      (r.amountCents / 100).toFixed(2),
      (r.refundedCents / 100).toFixed(2),
      (r.netCents / 100).toFixed(2),
      r.referenceNumber ?? "",
      recorded,
    ]
      .map((v) => `"${String(v).replaceAll('"', '""')}"`)
      .join(",");
  });
  return [header.join(","), ...lines].join("\n");
}
