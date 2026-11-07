import { format } from "date-fns";
import {
  printBlockField,
  printInlineField,
  wrapHiwetPrintDocument,
} from "@/lib/print/hiwet-print-shell";

export type ObstetricUsReportFormValues = {
  patientName: string;
  age: string;
  cardNo: string;
  date: string;
  numberOfFetus: string;
  viabilityFhb: string;
  fetalPresentation: string;
  gsCrlBpdFlAga: string;
  amnioticFluidVolume: string;
  placentalPositionGrade: string;
  estimatedFetalWeight: string;
  grossAnomaly: string;
  index: string;
  recommendation: string;
  doctorName: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function displayDate(iso?: string) {
  if (!iso?.trim()) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.trim();
  return format(d, "dd MMMM yyyy");
}

function checkLine(label: string, value: string) {
  return `<div class="row-inline mt-sm">
    ${printInlineField(`✔ ${label}`, value, true)}
  </div>`;
}

export function buildObstetricUsReportHtml(input: {
  sheet: ObstetricUsReportFormValues;
  encounterNumber?: string;
  logoUrl?: string | null;
}): string {
  const { sheet, encounterNumber = "", logoUrl = null } = input;

  const mainHtml = `
    <h2 class="sheet-title">Obstetric U/S Report Format</h2>
    <div class="row-inline">
      ${printInlineField("✔ Pt's Name", sheet.patientName, true)}
    </div>
    <div class="row-inline mt-sm">
      ${printInlineField("✔ Age", sheet.age)}
      ${printInlineField("CardNo", sheet.cardNo)}
      ${printInlineField("Date", displayDate(sheet.date) || sheet.date)}
    </div>
    ${checkLine("Number of fetus", sheet.numberOfFetus)}
    ${checkLine("Viability/FHB", sheet.viabilityFhb)}
    ${checkLine("Fetal Presentation", sheet.fetalPresentation)}
    ${checkLine("Gs, CRL, BPD, FL, AGA", sheet.gsCrlBpdFlAga)}
    ${checkLine("Amniotic Fluid Volume", sheet.amnioticFluidVolume)}
    ${checkLine("Placental Position and Grade", sheet.placentalPositionGrade)}
    ${checkLine("Estimated Fetal Weight", sheet.estimatedFetalWeight)}
    ${checkLine("Is There an evidence of Gross Anomaly:", sheet.grossAnomaly)}
    ${printBlockField("Index:", sheet.index, 3)}
    ${printBlockField("Recommendation", sheet.recommendation, 4)}
    <div class="sig-row">
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-label">Name &amp; Sign</div>
        ${sheet.doctorName.trim() ? `<span class="sig-doctor">${escapeHtml(sheet.doctorName.trim())}</span>` : ""}
      </div>
    </div>
  `;

  return wrapHiwetPrintDocument({
    title: `Obstetric U/S - ${sheet.patientName || "Patient"}`,
    mainHtml,
    logoUrl,
    encounterNumber,
  });
}
