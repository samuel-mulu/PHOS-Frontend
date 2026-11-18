import { api } from "@/lib/api/client";

export type HmisLabRow = {
  test: string;
  op_neg: number;
  op_pos: number;
  ip_neg: number;
  ip_pos: number;
  countOnly: boolean;
  performed: number;
};

export type HmisAgeBand =
  | "<1yr"
  | "1-4yr"
  | "5-14yr"
  | "15-29yr"
  | "30-64yr"
  | ">=65yr";

export type HmisWeeklyRow = {
  indicator: string;
  cases: number | null;
  deaths: number | null;
};

export type HmisMorbidityRow = {
  name: string;
  total: number;
  bands: Record<HmisAgeBand, { M: number; F: number }>;
};

export type SexPair = { M: number; F: number };

export type HmisClinic = {
  facility: string;
  opd: SexPair & { total: number };
  ipd: SexPair & { total: number };
  opdByAge: Record<string, SexPair>;
  labPersons: {
    op: SexPair & { total: number };
    ip: SexPair & { total: number };
  };
  labTests: HmisLabRow[];
  labOtherBreakdown: Array<{ test: string; count: number }>;
  diseases: {
    malaria: number;
    malariaPF: number;
    malariaPV: number;
    meningitis: number;
    dysentery: number;
    typhoid: number;
    relapsingFever: number;
    epidemicTyphus: number;
    scabies: number;
    samUnder5: number;
    hepaticVod: number;
  };
  weekly: HmisWeeklyRow[];
  immediate: HmisWeeklyRow[];
  malaria: { examined: number; pf: number; pv: number; unspecified: number };
  hiv: {
    testedGeneral: number;
    positiveGeneral: number;
    testedPregnant: number;
    positivePregnant: number;
    artNew: number | null;
  };
  morbidities: HmisMorbidityRow[];
  topMorbidities: HmisMorbidityRow[];
  ageGroups: HmisAgeBand[];
  familyPlanning: {
    newByAge: Record<string, number>;
    repeatByAge: Record<string, number>;
    newByMethod: Record<string, number>;
    repeatByMethod: Record<string, number>;
    untypedVisit: number;
  };
  anc: {
    firstVisit: number;
    firstUnder16: number;
    firstAtLeast16: number;
    firstGaUnknown: number;
    firstByAge: Record<string, number>;
    fourthVisit: number;
    fourthByAge: Record<string, number>;
    syphilisTested: number;
    syphilisReactive: number;
    syphilisTreated: number | null;
    hepaTested: number;
    hepaReactive: number;
    hepaTreated: number | null;
    pncVisits: number;
  };
  delivery: {
    skilledBirths: number;
    caesarean: number;
    stillbirths: number;
    liveBirths: number;
    lowBirthWeight: number;
    weighed: number;
  };
  notRecorded: string[];
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

export type HmisForm = "lab" | "weekly" | "monthly";

export async function fetchHmisReport(from: string, to: string) {
  const { data } = await api.get<HmisReport>("/reports/hmis", {
    params: { from, to },
  });
  return data;
}

export function labTotalCell(row: HmisLabRow, side: "op" | "ip"): number | null {
  if (row.test === "Others") return side === "op" ? row.performed : 0;
  if (row.countOnly) return null;
  return side === "op" ? row.op_neg + row.op_pos : row.ip_neg + row.ip_pos;
}

export function labPmCell(
  row: HmisLabRow,
  side: "op" | "ip",
  kind: "neg" | "pos",
): number | null {
  if (row.countOnly) return null;
  if (side === "op") return kind === "neg" ? row.op_neg : row.op_pos;
  return kind === "neg" ? row.ip_neg : row.ip_pos;
}

function cellText(value: number | null) {
  return value == null ? "" : String(value);
}

export function hmisToCsv(report: HmisReport): string {
  const c = report.clinic;
  const rows: string[][] = [
    ["HMIS clinic report", report.facility],
    ["Period from", report.period.from],
    ["Period to", report.period.to],
    [],
    ["Laboratory"],
    ["Persons tested OP male", String(c?.labPersons.op.M ?? 0)],
    ["Persons tested OP female", String(c?.labPersons.op.F ?? 0)],
    ["Persons tested OP total", String(c?.labPersons.op.total ?? 0)],
    ["Test", "OP -ve", "OP +ve", "OP total", "IP -ve", "IP +ve", "IP total"],
    ...(c?.labTests ?? []).map((row) => [
      row.test,
      cellText(labPmCell(row, "op", "neg")),
      cellText(labPmCell(row, "op", "pos")),
      cellText(labTotalCell(row, "op")),
      cellText(labPmCell(row, "ip", "neg")),
      cellText(labPmCell(row, "ip", "pos")),
      cellText(labTotalCell(row, "ip")),
    ]),
    [],
    ["Weekly", "Cases", "Deaths"],
    ...(c?.weekly ?? []).map((row) => [
      row.indicator,
      cellText(row.cases),
      cellText(row.deaths),
    ]),
    [],
    ["Immediately reportable", "Cases", "Deaths"],
    ...(c?.immediate ?? []).map((row) => [
      row.indicator,
      cellText(row.cases),
      cellText(row.deaths),
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

  const labRows: (string | number)[][] = [
    ["Laboratory diagnostic activity", report.facility],
    ["From", from, "To", to],
    [],
    ["Outpatient persons", c?.labPersons.op.M ?? 0, c?.labPersons.op.F ?? 0, c?.labPersons.op.total ?? 0],
    ["Inpatient persons", c?.labPersons.ip.M ?? 0, c?.labPersons.ip.F ?? 0, c?.labPersons.ip.total ?? 0],
    [],
    ["Test", "OP -ve", "OP +ve", "OP total", "IP -ve", "IP +ve", "IP total"],
    ...(c?.labTests ?? []).map((row) => [
      row.test,
      labPmCell(row, "op", "neg") ?? "",
      labPmCell(row, "op", "pos") ?? "",
      labTotalCell(row, "op") ?? "",
      labPmCell(row, "ip", "neg") ?? "",
      labPmCell(row, "ip", "pos") ?? "",
      labTotalCell(row, "ip") ?? "",
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(labRows), "Laboratory");

  const weeklyRows: (string | number)[][] = [
    ["Indicator", "Cases", "Deaths"],
    ...(c?.weekly ?? []).map((row) => [row.indicator, row.cases ?? "", row.deaths ?? ""]),
    [],
    ["Immediately reportable", "Cases", "Deaths"],
    ...(c?.immediate ?? []).map((row) => [row.indicator, row.cases ?? "", row.deaths ?? ""]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(weeklyRows), "Weekly");

  if (c) {
    const fp = c.familyPlanning;
    const monthly: (string | number)[][] = [
      ["Indicator", "Value"],
      ["OPD male", c.opd.M],
      ["OPD female", c.opd.F],
      ["OPD total", c.opd.total],
      ["ANC first visit", c.anc.firstVisit],
      ["ANC first < 16 weeks", c.anc.firstUnder16],
      ["ANC first >= 16 weeks", c.anc.firstAtLeast16],
      ["ANC first, gestational age not recorded", c.anc.firstGaUnknown],
      ["ANC fourth visit or later", c.anc.fourthVisit],
      ["Syphilis tested", c.anc.syphilisTested],
      ["Syphilis reactive", c.anc.syphilisReactive],
      ["Hepatitis tested", c.anc.hepaTested],
      ["Hepatitis reactive", c.anc.hepaReactive],
      ["PNC visits", c.anc.pncVisits],
      ["Skilled births", c.delivery.skilledBirths],
      ["Caesarean", c.delivery.caesarean],
      ["Stillbirths", c.delivery.stillbirths],
      ["Live births", c.delivery.liveBirths],
      ["Low birth weight", c.delivery.lowBirthWeight],
      ["Live births weighed", c.delivery.weighed],
      ["Malaria examined", c.malaria.examined],
      ["Malaria Pf positive", c.malaria.pf],
      ["Malaria Pv positive", c.malaria.pv],
      ["HIV tested", c.hiv.testedGeneral],
      ["HIV positive", c.hiv.positiveGeneral],
      ["HIV tested, pregnant", c.hiv.testedPregnant],
      ["HIV positive, pregnant", c.hiv.positivePregnant],
      [],
      ["Family planning age", "New", "Repeat"],
      ...Object.keys(fp.newByAge).map((key) => [
        key,
        fp.newByAge[key] ?? 0,
        fp.repeatByAge[key] ?? 0,
      ]),
      [],
      ["Family planning method", "New", "Repeat"],
      ...Object.keys(fp.newByMethod).map((key) => [
        key,
        fp.newByMethod[key] ?? 0,
        fp.repeatByMethod[key] ?? 0,
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(monthly), "Monthly");

    const groups = c.ageGroups;
    const morbRows: (string | number)[][] = [
      ["Diagnosis", ...groups.flatMap((ag) => [`${ag} M`, `${ag} F`]), "Total"],
      ...c.morbidities.map((m) => [
        m.name,
        ...groups.flatMap((ag) => [m.bands[ag].M, m.bands[ag].F]),
        m.total,
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(morbRows), "Morbidity");
  }

  XLSX.writeFile(wb, `HMIS_${report.facility}_${from}_${to}.xlsx`);
}
