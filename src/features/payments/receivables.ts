import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

export type ReceivableRow = {
  id: string;
  invoiceNumber: string;
  status: string;
  issuedAt: string;
  ageDays: number;
  totalCents: number;
  paidCents: number;
  waivedCents: number;
  deferredCents: number;
  balanceCents: number;
  /** Patient is still waiting at the cashier for this invoice. */
  atCashier: boolean;
  patient: {
    id: string;
    patientNumber: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    phone: string | null;
  };
  encounter: {
    id: string;
    encounterNumber: string;
    visitNumber: number | null;
    status: string;
    startedAt: string;
  };
  deferReason: string | null;
  deferredAt: string | null;
  deferredBy: { id: string; firstName: string; lastName: string } | null;
};

export type ReceivablesReport = {
  asOf: string;
  period: { from: string; to: string };
  totals: {
    outstandingCents: number;
    outstandingCount: number;
    patientsOwing: number;
    aging: { days0to7: number; days8to30: number; days31plus: number };
  };
  periodTotals: {
    billedCents: number;
    invoiceCount: number;
    collectedCents: number;
    debtCollectedCents: number;
    payLaterCents: number;
    payLaterCount: number;
    waivedCents: number;
    waivedCount: number;
  };
  rows: ReceivableRow[];
};

export async function fetchReceivables(from: string, to: string) {
  const { data } = await api.get<ReceivablesReport>("/reports/receivables", {
    params: { from, to },
  });
  return data;
}

export function useReceivables(from: string, to: string) {
  return useQuery({
    queryKey: ["reports", "receivables", from, to],
    queryFn: () => fetchReceivables(from, to),
    refetchInterval: 30_000,
  });
}

function patientName(p: ReceivableRow["patient"]) {
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ");
}

function csvCell(value: string | number) {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

const etb = (cents: number) => (cents / 100).toFixed(2);

export function receivablesToCsv(report: ReceivablesReport): string {
  const header = [
    "Issued",
    "Age (days)",
    "Invoice #",
    "Visit #",
    "Patient #",
    "Patient",
    "Phone",
    "Total (ETB)",
    "Paid (ETB)",
    "Waived (ETB)",
    "Balance owed (ETB)",
    "Pay later reason",
    "Approved by",
  ];
  const lines = report.rows.map((r) =>
    [
      r.issuedAt.slice(0, 10),
      r.ageDays,
      r.invoiceNumber,
      r.encounter.encounterNumber,
      r.patient.patientNumber,
      patientName(r.patient),
      r.patient.phone ?? "",
      etb(r.totalCents),
      etb(r.paidCents),
      etb(r.waivedCents),
      etb(r.balanceCents),
      r.deferReason ?? "",
      r.deferredBy ? `${r.deferredBy.firstName} ${r.deferredBy.lastName}` : "",
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export { patientName as receivablePatientName };
