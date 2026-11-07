import { format } from "date-fns";
import {
  printBlockField,
  printInlineField,
  wrapHiwetPrintDocument,
} from "@/lib/print/hiwet-print-shell";

export type MedicalCertificateFormValues = {
  cardNo: string;
  date: string;
  name: string;
  admittedOn: string;
  diagnosis: string;
  dischargedOn: string;
  recommendedRest: string;
  recommendations: string;
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

export function buildMedicalCertificateHtml(input: {
  sheet: MedicalCertificateFormValues;
  encounterNumber?: string;
  logoUrl?: string | null;
}): string {
  const { sheet, encounterNumber = "", logoUrl = null } = input;

  const headerMetaHtml = `
    <div class="meta-line">
      <span class="meta-label">Card No</span>
      <span class="meta-value">${escapeHtml(sheet.cardNo.trim() || " ")}</span>
    </div>
    <div class="meta-line">
      <span class="meta-label">Date</span>
      <span class="meta-value">${escapeHtml(displayDate(sheet.date) || " ")}</span>
    </div>
  `;

  const mainHtml = `
    <p class="sheet-title-am">የህክምና ምስክር ወረቀት</p>
    <h2 class="sheet-title">MEDICAL CERTIFICATE</h2>
    <div class="row-inline">
      ${printInlineField("Name:", sheet.name, true)}
    </div>
    <div class="row-inline mt-sm">
      ${printInlineField("Admitted on:", displayDate(sheet.admittedOn) || sheet.admittedOn, true)}
    </div>
    <div class="row-inline mt-sm">
      ${printInlineField("Diagnosis:", sheet.diagnosis, true)}
    </div>
    <div class="row-inline mt-sm">
      ${printInlineField("Discharged on:", displayDate(sheet.dischargedOn) || sheet.dischargedOn, true)}
    </div>
    <div class="row-inline mt-sm">
      ${printInlineField("Recommended rest:", sheet.recommendedRest, true)}
    </div>
    ${printBlockField("Doctor's Recommendations:", sheet.recommendations, 4)}
    <div class="sig-row">
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-label">Dr. sig</div>
        ${sheet.doctorName.trim() ? `<span class="sig-doctor">${escapeHtml(sheet.doctorName.trim())}</span>` : ""}
      </div>
    </div>
  `;

  return wrapHiwetPrintDocument({
    title: `Medical Certificate - ${sheet.name || "Patient"}`,
    mainHtml,
    logoUrl,
    encounterNumber,
    headerMetaHtml,
  });
}
