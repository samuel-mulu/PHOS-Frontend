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
  /** Collected against an earlier pay-later debt. */
  isDebtPayment?: boolean;
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

type StaffRef = { id: string; firstName: string; lastName: string };

/** Waived (free) or cancelled (left without paying) at the cashier. */
export type PaymentAdjustmentRow = {
  id: string;
  type: "WAIVE" | "CANCEL";
  createdAt: string;
  amountCents: number;
  reason: string;
  invoice: { id: string; invoiceNumber: string };
  patient: PaymentReportRow["patient"];
  recordedBy: StaffRef;
  /** Doctor who asked for it to be free. */
  requestedBy: StaffRef | null;
};

export const ADJUSTMENT_TYPE_LABEL: Record<PaymentAdjustmentRow["type"], string> = {
  WAIVE: "Waived / free",
  CANCEL: "Cancelled",
};

export type PaymentReport = {
  period: { from: string; to: string };
  totals: {
    count: number;
    amountCents: number;
    refundedCents: number;
    netCents: number;
    debtCollectedCents?: number;
    byMethod: Record<string, { count: number; amountCents: number }>;
    waivedCents?: number;
    waivedCount?: number;
    cancelledCents?: number;
    cancelledCount?: number;
  };
  rows: PaymentReportRow[];
  adjustments?: PaymentAdjustmentRow[];
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
  const adjustments = report.adjustments ?? [];
  if (adjustments.length === 0) return [header.join(","), ...lines].join("\n");
  const adjHeader = [
    "Date",
    "Type",
    "Invoice #",
    "Patient #",
    "Patient",
    "Amount (ETB)",
    "Reason",
    "Recorded by",
    "Requested by (doctor)",
  ];
  const adjLines = adjustments.map((a) =>
    [
      a.createdAt,
      ADJUSTMENT_TYPE_LABEL[a.type],
      a.invoice.invoiceNumber,
      a.patient.patientNumber,
      [a.patient.firstName, a.patient.middleName, a.patient.lastName]
        .filter(Boolean)
        .join(" "),
      (a.amountCents / 100).toFixed(2),
      a.reason,
      `${a.recordedBy.firstName} ${a.recordedBy.lastName}`,
      a.requestedBy ? `${a.requestedBy.firstName} ${a.requestedBy.lastName}` : "",
    ]
      .map((v) => `"${String(v).replaceAll('"', '""')}"`)
      .join(","),
  );
  return [
    header.join(","),
    ...lines,
    "",
    '"Waived & cancelled"',
    adjHeader.join(","),
    ...adjLines,
  ].join("\n");
}
