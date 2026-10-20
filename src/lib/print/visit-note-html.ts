import { format } from "date-fns";
import { ageYears } from "@/lib/format/age";
import {
  HIWET_BRAND,
  VISIT_SECTION_STYLE,
  type VisitPrintSectionKey,
} from "@/lib/print/hiwet-brand";
import type { Patient } from "@/types/patient";

export type VisitNoteSection = VisitPrintSectionKey;

export const VISIT_NOTE_SECTION_LABEL: Record<VisitNoteSection, string> = {
  vitals: VISIT_SECTION_STYLE.vitals.label,
  notes: VISIT_SECTION_STYLE.notes.label,
  diagnosis: VISIT_SECTION_STYLE.diagnosis.label,
  ultrasound: VISIT_SECTION_STYLE.ultrasound.label,
  prescription: VISIT_SECTION_STYLE.prescription.label,
};

export const DEFAULT_VISIT_NOTE_SECTIONS: Record<VisitNoteSection, boolean> = {
  vitals: true,
  notes: true,
  diagnosis: true,
  ultrasound: true,
  prescription: true,
};

export type VisitNoteConsultation = {
  physicalExam?: string | null;
  notes?: string | null;
  assessment?: string | null;
  plan?: string | null;
  historyPresentIllness?: string | null;
  doctor?: { firstName: string; lastName: string } | null;
} | null;

export type VisitNoteEncounterSource = {
  visitNumber?: number | null;
  startedAt: string;
  encounterNumber?: string;
  assignedDoctor?: { firstName: string; lastName: string } | null;
  consultation?: VisitNoteConsultation;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatSex(sex: string) {
  const normalized = sex.replaceAll("_", " ").toLowerCase();
  if (normalized === "female") return "Female";
  if (normalized === "male") return "Male";
  if (normalized === "unknown" || normalized === "other") {
    return sex.replaceAll("_", " ");
  }
  return sex.replaceAll("_", " ");
}

export function visitNoteSectionText(
  consultation: VisitNoteConsultation,
  key: VisitNoteSection,
): string {
  if (!consultation) return "";
  switch (key) {
    case "vitals":
      return consultation.physicalExam?.trim() ?? "";
    case "notes":
      return consultation.notes?.trim() ?? "";
    case "diagnosis":
      return consultation.assessment?.trim() ?? "";
    case "ultrasound":
      return consultation.plan?.trim() ?? "";
    case "prescription":
      return consultation.historyPresentIllness?.trim() ?? "";
  }
}

function sectionBlock(key: VisitNoteSection, body: string) {
  const style = VISIT_SECTION_STYLE[key];
  return `<div class="stack-section" style="border-left-color:${style.bar};background:${style.tint}">
      <h3 style="color:${style.title}"><span class="sec-icon">${style.icon}</span>${escapeHtml(style.label)}</h3>
      <pre>${escapeHtml(body || "-")}</pre>
    </div>`;
}

function sexIcon(sex: string) {
  const n = sex.replaceAll("_", " ").toLowerCase();
  if (n === "female") return "👩";
  if (n === "male") return "👨";
  return "👤";
}

function resolveDoctor(
  encounter: VisitNoteEncounterSource,
): string {
  const c = encounter.consultation;
  const person =
    encounter.assignedDoctor ??
    (c && "doctor" in c ? c.doctor : null) ??
    null;
  if (!person) return "";
  return `Dr. ${person.firstName} ${person.lastName}`;
}

/** Single visit Hiwet-style visit note HTML. */
export function buildVisitNoteHtml(input: {
  patient: Patient;
  encounter: VisitNoteEncounterSource;
  selected: Record<VisitNoteSection, boolean>;
  logoUrl?: string | null;
}): string {
  const { patient, encounter, selected, logoUrl = null } = input;
  const c = encounter.consultation ?? null;
  const visitNumber = encounter.visitNumber ?? 1;
  const name = [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(" ");
  const age = ageYears(patient.dateOfBirth);
  const dateStr = format(new Date(encounter.startedAt), "dd MMMM yyyy");
  const doctor = resolveDoctor(encounter);

  const order: VisitNoteSection[] = [
    "vitals",
    "notes",
    "diagnosis",
    "ultrasound",
    "prescription",
  ];
  const blocks = order
    .filter((key) => selected[key])
    .map((key) => sectionBlock(key, visitNoteSectionText(c, key)));

  const sidebarItems = HIWET_BRAND.sidebarServices
    .map(
      (item) =>
        `<li><span class="check">✔</span><span>${escapeHtml(item)}</span></li>`,
    )
    .join("");

  const logoHtml = logoUrl
    ? `<img class="logo" src="${logoUrl}" alt="Hiwet Clinic" />`
    : `<div class="logo-fallback">${escapeHtml(HIWET_BRAND.nameEn.charAt(0))}</div>`;

  const { colors } = HIWET_BRAND;
  const sexLabel = formatSex(patient.sex);
  const encNum = encounter.encounterNumber ?? "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Visit ${visitNumber} - ${escapeHtml(name)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Noto Sans Ethiopic", "Nyala", "Abyssinica SIL", "Segoe UI", system-ui, sans-serif;
    color: ${colors.ink};
    margin: 0;
    padding: 18px 20px 14px;
    background: #fff;
  }
  .visit-page + .visit-page { page-break-before: always; padding-top: 18px; }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    border-bottom: 2px solid ${colors.tealBorder};
    padding-bottom: 12px;
    margin-bottom: 14px;
  }
  .brand-row { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .logo, .logo-fallback {
    width: 56px;
    height: 56px;
    border-radius: 999px;
    object-fit: cover;
    border: 2px solid ${colors.teal};
    box-shadow: 0 2px 8px rgba(15, 118, 110, 0.18);
    flex-shrink: 0;
  }
  .logo-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ccfbf1;
    color: ${colors.teal};
    font-weight: 800;
    font-size: 20px;
  }
  .brand-title {
    margin: 0;
    font-size: 22px;
    font-weight: 800;
    color: ${colors.tealDark};
    letter-spacing: -0.02em;
    line-height: 1.15;
  }
  .brand-sub {
    margin: 4px 0 0;
    font-size: 11px;
    color: ${colors.muted};
    font-weight: 500;
  }
  .date-block { text-align: right; flex-shrink: 0; }
  .date-label {
    margin: 0;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #2563eb;
    font-weight: 700;
  }
  .date-value {
    margin: 2px 0 0;
    font-size: 13px;
    font-weight: 700;
    color: ${colors.ink};
  }
  .visit-badge {
    display: inline-block;
    margin-top: 6px;
    background: linear-gradient(135deg, ${colors.teal}, #0d9488);
    color: #fff;
    border-radius: 999px;
    padding: 2px 10px;
    font-size: 11px;
    font-weight: 700;
  }
  .layout {
    display: grid;
    grid-template-columns: 22% 1fr;
    gap: 14px;
    align-items: start;
  }
  .sidebar {
    background: linear-gradient(165deg, #f0fdfa 0%, #fff 42%, #ecfeff 100%);
    border: 1px solid ${colors.patientBorder};
    border-left: 3px solid ${colors.teal};
    border-radius: 12px;
    padding: 12px 10px 14px;
    box-shadow: 0 2px 10px rgba(15, 118, 110, 0.08);
  }
  .sidebar h2 {
    margin: 0 0 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid #99f6e4;
    font-size: 11px;
    font-weight: 700;
    color: ${colors.tealDark};
    letter-spacing: 0.04em;
    line-height: 1.3;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .sidebar h2 .side-icon { font-size: 14px; }
  .sidebar ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .sidebar li {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    font-size: 10.5px;
    font-weight: 500;
    color: #334155;
    line-height: 1.35;
  }
  .sidebar .check {
    color: ${colors.check};
    font-size: 12px;
    font-weight: 800;
    line-height: 1.2;
    flex-shrink: 0;
  }
  .main { min-width: 0; }
  .patient {
    background: linear-gradient(110deg, ${colors.patientBg}, ${colors.cyanSoft});
    border: 1px solid ${colors.patientBorder};
    border-radius: 12px;
    padding: 13px 14px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 18px;
    margin-bottom: 16px;
    font-size: 13px;
    box-shadow: 0 1px 6px rgba(15, 118, 110, 0.07);
  }
  .patient .field { min-width: 0; }
  .patient .label {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 600;
    color: ${colors.muted};
    margin-bottom: 3px;
  }
  .patient .label .ico { font-size: 13px; line-height: 1; }
  .patient .value {
    font-weight: 700;
    color: ${colors.ink};
    padding-left: 2px;
  }
  .stack-section {
    border-left: 5px solid #94a3b8;
    border-radius: 0 10px 10px 0;
    padding: 10px 12px 10px 14px;
    margin-bottom: 12px;
  }
  .stack-section h3 {
    margin: 0 0 5px;
    font-size: 15px;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .stack-section .sec-icon { font-size: 16px; line-height: 1; }
  .stack-section pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: inherit;
    font-size: 13px;
    line-height: 1.5;
    color: #334155;
    font-weight: 600;
  }
  .sigs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 48px;
    margin-top: 36px;
    padding-top: 16px;
    border-top: 1px solid #e2e8f0;
  }
  .sig { text-align: center; }
  .sig-line {
    height: 0;
    border-top: 1px solid #94a3b8;
    margin: 0 auto 8px;
    width: 160px;
  }
  .sig-label {
    font-size: 12px;
    font-weight: 600;
    color: #475569;
  }
  .sig-doctor {
    display: block;
    margin-top: 2px;
    font-size: 11px;
    color: ${colors.muted};
    font-weight: 500;
  }
  .footer {
    margin-top: 22px;
    padding-top: 12px;
    border-top: 2px solid ${colors.tealBorder};
    text-align: center;
  }
  .footer-am {
    margin: 0;
    font-size: 12px;
    font-weight: 700;
    color: ${colors.tealDark};
    line-height: 1.45;
  }
  .footer-am .pin { color: ${colors.pin}; }
  .footer-phones {
    margin: 6px 0 0;
    font-size: 12px;
    color: #334155;
    font-weight: 600;
  }
  .footer-phones .phone-ico { color: ${colors.phone}; }
  .footer-en {
    margin: 6px 0 0;
    font-size: 10px;
    color: #94a3b8;
  }
  .footer-meta {
    margin: 4px 0 0;
    font-size: 10px;
    color: #cbd5e1;
  }
  @media print {
    body { padding: 0; }
    .sidebar,
    .patient,
    .visit-badge,
    .stack-section,
    .logo {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
</style></head><body>
  <div class="visit-page">
  <header class="header">
    <div class="brand-row">
      ${logoHtml}
      <div>
        <h1 class="brand-title">${escapeHtml(HIWET_BRAND.titleBilingual)}</h1>
        <p class="brand-sub">${HIWET_BRAND.tagline}</p>
      </div>
    </div>
    <div class="date-block">
      <p class="date-label">📅 DATE</p>
      <p class="date-value">${escapeHtml(dateStr)}</p>
      <span class="visit-badge">Visit ${visitNumber}</span>
    </div>
  </header>

  <div class="layout">
    <aside class="sidebar">
      <h2><span class="side-icon">${HIWET_BRAND.sidebarIcon}</span>${escapeHtml(HIWET_BRAND.sidebarTitle)}</h2>
      <ul>${sidebarItems}</ul>
    </aside>
    <main class="main">
      <div class="patient">
        <div class="field">
          <span class="label"><span class="ico">👤</span> Patient</span>
          <span class="value">${escapeHtml(name)}</span>
        </div>
        <div class="field">
          <span class="label"><span class="ico">📞</span> Phone</span>
          <span class="value">${escapeHtml(patient.phone ?? "-")}</span>
        </div>
        <div class="field">
          <span class="label"><span class="ico">${sexIcon(patient.sex)}</span> Sex</span>
          <span class="value">${escapeHtml(sexLabel)}</span>
        </div>
        <div class="field">
          <span class="label"><span class="ico">🎂</span> Age</span>
          <span class="value">${age != null ? age : "-"}</span>
        </div>
      </div>
      ${blocks.join("")}
      <div class="sigs">
        <div class="sig">
          <div class="sig-line"></div>
          <div class="sig-label">✍️ Doctor Signature</div>
          ${doctor ? `<span class="sig-doctor">${escapeHtml(doctor)}</span>` : ""}
        </div>
        <div class="sig">
          <div class="sig-line"></div>
          <div class="sig-label">🏥 Clinic Stamp</div>
        </div>
      </div>
    </main>
  </div>

  <footer class="footer">
    <p class="footer-am">${escapeHtml(HIWET_BRAND.footerAm)} | <span class="pin">📍</span> ${escapeHtml(HIWET_BRAND.footerAddress)}</p>
    <p class="footer-phones"><span class="phone-ico">📞</span> ${escapeHtml(HIWET_BRAND.phones)}</p>
    <p class="footer-en">${HIWET_BRAND.footerEn}</p>
    <p class="footer-meta">${escapeHtml(encNum)}</p>
  </footer>
  </div>
</body></html>`;
}

function extractVisitPage(html: string): string {
  const start = html.indexOf('<div class="visit-page"');
  if (start === -1) return "";
  const footerEnd = html.indexOf("</footer>", start);
  if (footerEnd === -1) return "";
  const closeDiv = html.indexOf("</div>", footerEnd);
  if (closeDiv === -1) return "";
  return html.slice(start, closeDiv + 6);
}

/** Merge multiple visit notes into one printable document. */
export function buildCombinedVisitNotesHtml(input: {
  patient: Patient;
  encounters: VisitNoteEncounterSource[];
  selected: Record<VisitNoteSection, boolean>;
  logoUrl?: string | null;
}): string {
  if (input.encounters.length === 0) return "";
  if (input.encounters.length === 1) {
    return buildVisitNoteHtml({
      patient: input.patient,
      encounter: input.encounters[0]!,
      selected: input.selected,
      logoUrl: input.logoUrl,
    });
  }
  const pages = input.encounters.map((enc, i) => {
    const html = buildVisitNoteHtml({
      patient: input.patient,
      encounter: enc,
      selected: input.selected,
      logoUrl: input.logoUrl,
    });
    let page = extractVisitPage(html);
    if (i > 0) {
      page = page.replace(
        '<div class="visit-page">',
        '<div class="visit-page" style="page-break-before: always;">',
      );
    }
    return page;
  });
  const shell = buildVisitNoteHtml({
    patient: input.patient,
    encounter: input.encounters[0]!,
    selected: input.selected,
    logoUrl: input.logoUrl,
  });
  const head =
    shell.match(/<head[\s\S]*?<\/head>/i)?.[0] ??
    '<head><meta charset="utf-8"/></head>';
  return `<!DOCTYPE html><html>${head}<body>${pages.join("")}</body></html>`;
}
