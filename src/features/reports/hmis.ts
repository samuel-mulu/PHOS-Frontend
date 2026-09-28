import { api } from "@/lib/api/client";

export type HmisReport = {
  facility: string;
  period: { from: string; to: string };
  newPatients: number;
  encounters: number;
  encountersByStatus: Record<string, number>;
  labOrdersVerified: number;
  prescriptions: number;
  appointmentsScheduled: number;
  paymentsCount: number;
  paymentsTotalCents: number;
};

export async function fetchHmisReport(from: string, to: string) {
  const { data } = await api.get<HmisReport>("/reports/hmis", {
    params: { from, to },
  });
  return data;
}

export function hmisToCsv(report: HmisReport): string {
  const rows: string[][] = [
    ["HMIS summary", report.facility],
    ["Period from", report.period.from],
    ["Period to", report.period.to],
    [],
    ["Indicator", "Value"],
    ["New patients registered", String(report.newPatients)],
    ["Total encounters", String(report.encounters)],
    ["Lab orders verified", String(report.labOrdersVerified)],
    ["Prescriptions", String(report.prescriptions)],
    ["Appointments scheduled", String(report.appointmentsScheduled)],
    ["Payments (count)", String(report.paymentsCount)],
    ["Payments total (ETB)", (report.paymentsTotalCents / 100).toFixed(2)],
    [],
    ["Encounters by status", "Count"],
    ...Object.entries(report.encountersByStatus).map(([k, v]) => [k, String(v)]),
  ];
  return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
}

function escapeCsv(cell: string) {
  if (/[",\n]/.test(cell)) return `"${cell.replaceAll('"', '""')}"`;
  return cell;
}

export function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadHmisXlsx(report: HmisReport, from: string, to: string) {
  const XLSX = await import("xlsx");
  const summaryRows: (string | number)[][] = [
    ["HMIS / Ministry export", report.facility],
    ["Period from", report.period.from],
    ["Period to", report.period.to],
    [],
    ["Section", "Indicator", "Value"],
    ["Registration", "New patients registered", report.newPatients],
    ["Outpatient", "Total encounters", report.encounters],
    ["Laboratory", "Lab orders verified", report.labOrdersVerified],
    ["Pharmacy", "Prescriptions issued", report.prescriptions],
    ["Appointments", "Appointments scheduled", report.appointmentsScheduled],
    ["Finance", "Payments (count)", report.paymentsCount],
    ["Finance", "Payments total (ETB)", report.paymentsTotalCents / 100],
  ];
  const statusRows: (string | number)[][] = [
    ["Encounter status", "Count"],
    ...Object.entries(report.encountersByStatus).map(([status, count]) => [
      status,
      count,
    ]),
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(summaryRows),
    "HMIS Summary",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(statusRows),
    "Encounters by status",
  );
  XLSX.writeFile(wb, `hmis-${from}-to-${to}.xlsx`);
}
