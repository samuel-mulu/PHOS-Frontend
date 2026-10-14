import { api } from "@/lib/api/client";

export type HmisLabRow = {
  test: string;
  op_neg: number;
  op_pos: number;
  ip_neg: number;
  ip_pos: number;
};

export type HmisAgeBand =
  | "<1yr"
  | "1-4yr"
  | "5-14yr"
  | "15-29yr"
  | "30-64yr"
  | ">=65yr";

export type HmisClinic = {
  facility: string;
  opd: { M: number; F: number; total: number };
  ipd: { M: number; F: number; total: number };
  labTests: HmisLabRow[];
  diseases: {
    malariaPF: number;
    malariaPV: number;
    meningitis: number;
    dysentery: number;
    typhoid: number;
    relapsingFever: number;
    epidemicTyphus: number;
    scabies: number;
    samUnder5: number;
  };
  hiv: {
    testedGeneral: number;
    positiveGeneral: number;
    testedPregnant: number;
    positivePregnant: number;
    artNew: number;
  };
  topMorbidities: Array<{
    name: string;
    total: number;
    bands: Record<HmisAgeBand, { M: number; F: number }>;
  }>;
  ageGroups: HmisAgeBand[];
  familyPlanning: {
    newAcceptors: Record<string, number>;
    methodNew: Record<string, number>;
  };
  anc: {
    firstVisit: number;
    fourthVisit: number;
    syphilisTested: number;
    syphilisReactive: number;
    syphilisTreated: number;
    hepaTested: number;
    hepaReactive: number;
    pncVisits: number;
  };
  epi: Record<string, number>;
  notes: string[];
};

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
  clinic?: HmisClinic;
};

export async function fetchHmisReport(from: string, to: string) {
  const { data } = await api.get<HmisReport>("/reports/hmis", {
    params: { from, to },
  });
  return data;
}

export function hmisToCsv(report: HmisReport): string {
  const c = report.clinic;
  const rows: string[][] = [
    ["HMIS Automatic Clinic Report", report.facility],
    ["Period from", report.period.from],
    ["Period to", report.period.to],
    [],
    ["Test", "OP -ve", "OP +ve", "OP Total", "IP -ve", "IP +ve", "IP Total"],
    ...(c?.labTests ?? []).map((row) => [
      row.test,
      String(row.op_neg),
      String(row.op_pos),
      String(row.op_neg + row.op_pos),
      String(row.ip_neg),
      String(row.ip_pos),
      String(row.ip_neg + row.ip_pos),
    ]),
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

export async function downloadHmisXlsx(
  report: HmisReport,
  from: string,
  to: string,
) {
  const XLSX = await import("xlsx");
  const c = report.clinic;
  const wb = XLSX.utils.book_new();

  const summaryRows: (string | number)[][] = [
    ["HMIS Automatic Clinic Report", report.facility],
    ["Period from", from],
    ["Period to", to],
    [],
    ["OPD Male", c?.opd.M ?? 0],
    ["OPD Female", c?.opd.F ?? 0],
    ["OPD Total", c?.opd.total ?? report.encounters],
    ["New patients", report.newPatients],
    ["Lab orders verified", report.labOrdersVerified],
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(summaryRows),
    "Summary",
  );

  const labRows: (string | number)[][] = [
    ["Test", "OP -ve", "OP +ve", "OP Total", "IP -ve", "IP +ve", "IP Total"],
    ...(c?.labTests ?? []).map((row) => [
      row.test,
      row.op_neg,
      row.op_pos,
      row.op_neg + row.op_pos,
      row.ip_neg,
      row.ip_pos,
      row.ip_neg + row.ip_pos,
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(labRows), "Laboratory");

  if (c) {
    const d = c.diseases;
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["Disease", "Cases"],
        ["Malaria Pf", d.malariaPF],
        ["Malaria Pv", d.malariaPV],
        ["Meningitis", d.meningitis],
        ["Dysentery", d.dysentery],
        ["Typhoid", d.typhoid],
        ["Relapsing fever", d.relapsingFever],
        ["Epidemic typhus", d.epidemicTyphus],
        ["Scabies", d.scabies],
        ["SAM <5y", d.samUnder5],
      ]),
      "Diseases",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ["Population", "Tested", "Positive"],
        ["General", c.hiv.testedGeneral, c.hiv.positiveGeneral],
        ["Pregnant (MCH/PNC + HIV)", c.hiv.testedPregnant, c.hiv.positivePregnant],
        ["New ART", c.hiv.artNew, ""],
      ]),
      "HIV",
    );
    const groups = c.ageGroups;
    const morbRows: (string | number)[][] = [
      ["Diagnosis", ...groups.flatMap((ag) => [`${ag} M`, `${ag} F`]), "Total"],
      ...c.topMorbidities.map((m) => [
        m.name,
        ...groups.flatMap((ag) => [m.bands[ag].M, m.bands[ag].F]),
        m.total,
      ]),
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(morbRows),
      "Morbidities",
    );
  }

  XLSX.writeFile(wb, `HMIS_${report.facility}_${from}_${to}.xlsx`);
}
