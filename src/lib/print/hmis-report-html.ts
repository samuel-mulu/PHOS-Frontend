import { format } from "date-fns";
import {
  labPmCell,
  labTotalCell,
  type HmisClinic,
  type HmisForm,
  type HmisMorbidityRow,
  type HmisReport,
  type HmisWeeklyRow,
} from "@/features/reports/hmis";
import { wrapHiwetPrintDocument } from "@/lib/print/hiwet-print-shell";

const ETH_MONTHS = [
  "Meskerem",
  "Tikimt",
  "Hidar",
  "Tahsas",
  "Tir",
  "Yekatit",
  "Megabit",
  "Miazia",
  "Ginbot",
  "Sene",
  "Hamle",
  "Nehase",
  "Pagume",
];

const FORM_TITLE: Record<HmisForm, string> = {
  lab: "Laboratory report",
  weekly: "Weekly surveillance report",
  monthly: "Monthly service delivery report",
};

const HMIS_TABLE_CSS = `
  h2.form-title { margin: 0 0 4px; font-size: 15px; color: #0d5c56; letter-spacing: 0.01em; }
  p.form-sub { margin: 0 0 10px; font-size: 11px; color: #64748b; }
  h3.block { margin: 12px 0 6px; font-size: 12px; color: #0d5c56; }
  table.hmis { width: 100%; border-collapse: collapse; margin: 0 0 8px; }
  table.hmis th, table.hmis td { border: 1px solid #99f6e4; padding: 3px 5px; font-size: 10px; vertical-align: top; }
  table.hmis th { background: #f0fdfa; color: #0d5c56; font-weight: 700; text-align: left; }
  table.hmis td.num, table.hmis th.num { text-align: right; font-variant-numeric: tabular-nums; }
  table.hmis tr.total td { font-weight: 700; background: #f8fffe; }
  p.note { margin: 4px 0; font-size: 10px; color: #64748b; }
  .hmis-sign { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 18px; }
  .hmis-sign .sig-line { border-bottom: 1px solid #64748b; height: 28px; margin-bottom: 4px; }
  .hmis-sign .sig-label { font-size: 11px; font-weight: 600; }
`;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function gregorianToJdn(year: number, month: number, day: number) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

function ethiopianLabel(date: Date) {
  const jdn = gregorianToJdn(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
  const epoch = 1723856;
  const r = (jdn - epoch) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const year =
    4 * Math.floor((jdn - epoch) / 1461) +
    Math.floor(r / 365) -
    Math.floor(r / 1460);
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;
  const name = ETH_MONTHS[month - 1] ?? `Month ${month}`;
  return `${day} ${name} ${year} E.C.`;
}

function dash(value: number | null) {
  return value == null ? "—" : String(value);
}

function num(value: number | null) {
  return `<td class="num">${dash(value)}</td>`;
}

function table(headers: string[], rows: string[][]) {
  const head = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const body = rows.map((row) => `<tr>${row.join("")}</tr>`).join("");
  return `<table class="hmis"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function textCell(value: string) {
  return `<td>${escapeHtml(value)}</td>`;
}

function weeklyTable(rows: HmisWeeklyRow[]) {
  return table(
    ["Indicator", "Cases", "Deaths"],
    rows.map((row) => [textCell(row.indicator), num(row.cases), num(row.deaths)]),
  );
}

function pairRows(entries: Array<[string, number, number]>) {
  return table(
    ["", "New", "Repeat"],
    entries.map(([label, a, b]) => [textCell(label), num(a), num(b)]),
  );
}

function morbidityTable(rows: HmisMorbidityRow[], ageGroups: HmisClinic["ageGroups"]) {
  const headers = [
    "Diagnosis",
    ...ageGroups.flatMap((band) => [`${band} M`, `${band} F`]),
    "Total",
  ];
  return table(
    headers,
    rows.map((row) => [
      textCell(row.name),
      ...ageGroups.flatMap((band) => [num(row.bands[band].M), num(row.bands[band].F)]),
      num(row.total),
    ]),
  );
}

function labBody(clinic: HmisClinic) {
  const people = table(
    ["", "Male", "Female", "Total"],
    [
      [
        textCell("1. Outpatient — persons who had a lab test"),
        num(clinic.labPersons.op.M),
        num(clinic.labPersons.op.F),
        num(clinic.labPersons.op.total),
      ],
      [
        textCell("2. Inpatient — persons who had a lab test"),
        num(clinic.labPersons.ip.M),
        num(clinic.labPersons.ip.F),
        num(clinic.labPersons.ip.total),
      ],
    ],
  );
  const tests = table(
    ["S.N", "Type of test", "OP -ve", "OP +ve", "OP total", "IP -ve", "IP +ve", "IP total"],
    clinic.labTests.map((row, index) => [
      num(index + 1),
      textCell(row.test),
      num(labPmCell(row, "op", "neg")),
      num(labPmCell(row, "op", "pos")),
      num(labTotalCell(row, "op")),
      num(labPmCell(row, "ip", "neg")),
      num(labPmCell(row, "ip", "pos")),
      num(labTotalCell(row, "ip")),
    ]),
  );
  const breakdown = clinic.labOtherBreakdown
    .filter((part) => part.count > 0)
    .map((part) => `${escapeHtml(part.test)} ${part.count}`)
    .join(" · ");
  return `
    <h2 class="form-title">Laboratory diagnostic activity</h2>
    <p class="form-sub">Persons are counted once. Each verified result is counted in the test table.</p>
    ${people}
    <h3 class="block">Diagnostic activities</h3>
    ${tests}
    <p class="note">Tests with neither a positive nor a negative result are included under Others.</p>
    ${breakdown ? `<p class="note">Included under Others: ${breakdown}.</p>` : ""}
  `;
}

function weeklyBody(clinic: HmisClinic) {
  return `
    <h2 class="form-title">Weekly report</h2>
    <p class="form-sub">Cases come from diagnoses and verified malaria tests. Deaths are not recorded, so that column stays blank.</p>
    ${weeklyTable(clinic.weekly)}
    <h3 class="block">Immediately reportable</h3>
    ${weeklyTable(clinic.immediate)}
  `;
}

function monthlyBody(clinic: HmisClinic) {
  const fp = clinic.familyPlanning;
  const anc = clinic.anc;
  const opdRows = Object.entries(clinic.opdByAge).map(([band, pair]) => [
    textCell(band),
    num(pair.M),
    num(pair.F),
    num(pair.M + pair.F),
  ]);
  return `
    <h2 class="form-title">Monthly service delivery</h2>
    <p class="form-sub">Filled from visits, family planning, antenatal care, deliveries, and verified tests. A dash is not recorded.</p>
    <h3 class="block">Outpatient visits</h3>
    ${table(["Age", "Male", "Female", "Total"], opdRows)}
    <h3 class="block">Family planning — by age</h3>
    ${pairRows(Object.keys(fp.newByAge).map((key) => [key, fp.newByAge[key] ?? 0, fp.repeatByAge[key] ?? 0]))}
    <h3 class="block">Family planning — by method</h3>
    ${pairRows(Object.keys(fp.newByMethod).map((key) => [key, fp.newByMethod[key] ?? 0, fp.repeatByMethod[key] ?? 0]))}
    <h3 class="block">Antenatal care</h3>
    ${table(
      ["Indicator", "Count"],
      [
        [textCell("First visit, under 16 weeks"), num(anc.firstUnder16)],
        [textCell("First visit, 16 weeks or more"), num(anc.firstAtLeast16)],
        [textCell("First visit, gestational age not recorded"), num(anc.firstGaUnknown)],
        ...Object.keys(anc.firstByAge).map((key) => [textCell(`First visit, ${key}`), num(anc.firstByAge[key] ?? 0)]),
        [textCell("Fourth visit or later"), num(anc.fourthVisit)],
        ...Object.keys(anc.fourthByAge).map((key) => [textCell(`Fourth visit, ${key}`), num(anc.fourthByAge[key] ?? 0)]),
        [textCell("Syphilis tested"), num(anc.syphilisTested)],
        [textCell("Syphilis reactive"), num(anc.syphilisReactive)],
        [textCell("Syphilis treated"), num(anc.syphilisTreated)],
        [textCell("Hepatitis B or C tested"), num(anc.hepaTested)],
        [textCell("Hepatitis reactive"), num(anc.hepaReactive)],
        [textCell("Hepatitis treated"), num(anc.hepaTreated)],
        [textCell("Postnatal visits"), num(anc.pncVisits)],
      ],
    )}
    <h3 class="block">Delivery</h3>
    ${table(
      ["Indicator", "Count"],
      [
        [textCell("Births attended at the clinic"), num(clinic.delivery.skilledBirths)],
        [textCell("Caesarean section"), num(clinic.delivery.caesarean)],
        [textCell("Stillbirths"), num(clinic.delivery.stillbirths)],
        [textCell("Live births"), num(clinic.delivery.liveBirths)],
        [textCell("Low birth weight (under 2500 g)"), num(clinic.delivery.lowBirthWeight)],
        [textCell("Live births weighed"), num(clinic.delivery.weighed)],
      ],
    )}
    <h3 class="block">Malaria and HIV testing</h3>
    ${table(
      ["Indicator", "Count"],
      [
        [textCell("Slides or RDT performed"), num(clinic.malaria.examined)],
        [textCell("Positive Pf"), num(clinic.malaria.pf)],
        [textCell("Positive Pv"), num(clinic.malaria.pv)],
        [textCell("Positive, species not stated"), num(clinic.malaria.unspecified)],
        [textCell("HIV tested"), num(clinic.hiv.testedGeneral)],
        [textCell("HIV positive"), num(clinic.hiv.positiveGeneral)],
        [textCell("HIV tested during pregnancy, labour, or postnatal care"), num(clinic.hiv.testedPregnant)],
        [textCell("HIV positive in that group"), num(clinic.hiv.positivePregnant)],
        [textCell("New ART"), num(clinic.hiv.artNew)],
      ],
    )}
    <h3 class="block">Outpatient morbidity</h3>
    ${morbidityTable(clinic.morbidities, clinic.ageGroups)}
    <h3 class="block">Not recorded in this clinic system</h3>
    <p class="note">${clinic.notRecorded.map((item) => escapeHtml(item)).join(" · ")}</p>
  `;
}

function signOff() {
  return `<div class="hmis-sign">
    <div><div class="sig-line"></div><div class="sig-label">Reported by</div></div>
    <div><div class="sig-line"></div><div class="sig-label">Signature</div></div>
    <div><div class="sig-line"></div><div class="sig-label">Date</div></div>
  </div>`;
}

export function buildHmisReportHtml(input: {
  report: HmisReport;
  form: HmisForm;
  logoUrl?: string | null;
}): string {
  const clinic = input.report.clinic;
  if (!clinic) return "";
  const from = new Date(input.report.period.from);
  const to = new Date(input.report.period.to);
  const fromLabel = format(from, "dd MMM yyyy");
  const toLabel = format(to, "dd MMM yyyy");
  const ethFrom = ethiopianLabel(from);
  const ethTo = ethiopianLabel(to);
  const body =
    input.form === "lab"
      ? labBody(clinic)
      : input.form === "weekly"
        ? weeklyBody(clinic)
        : monthlyBody(clinic);

  const headerMetaHtml = `
    <div class="meta-line"><span class="meta-label">Report</span><span class="meta-value">${escapeHtml(FORM_TITLE[input.form])}</span></div>
    <div class="meta-line"><span class="meta-label">From</span><span class="meta-value">${escapeHtml(fromLabel)}</span></div>
    <div class="meta-line"><span class="meta-label">To</span><span class="meta-value">${escapeHtml(toLabel)}</span></div>
    <div class="meta-line"><span class="meta-label">E.C.</span><span class="meta-value">${escapeHtml(ethFrom === ethTo ? ethFrom : `${ethFrom} – ${ethTo}`)}</span></div>
  `;

  return wrapHiwetPrintDocument({
    title: `${FORM_TITLE[input.form]} — ${fromLabel} to ${toLabel}`,
    logoUrl: input.logoUrl,
    headerMetaHtml,
    sidebar: input.form !== "monthly",
    landscape: input.form === "monthly",
    extraCss: HMIS_TABLE_CSS,
    mainHtml: `${body}${signOff()}`,
  });
}

export function openPrintWindow(html: string) {
  const w = window.open("", "_blank", "width=1100,height=900");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}
