"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import type { EncounterDetail } from "@/features/encounters/api";
import { ageYears } from "@/lib/format/age";
import {
  HIWET_BRAND,
  VISIT_SECTION_STYLE,
  loadClinicLogoDataUrl,
  type VisitPrintSectionKey,
} from "@/lib/print/hiwet-brand";

export type VisitNoteSection = VisitPrintSectionKey;

const SECTION_LABEL: Record<VisitNoteSection, string> = {
  vitals: VISIT_SECTION_STYLE.vitals.label,
  notes: VISIT_SECTION_STYLE.notes.label,
  diagnosis: VISIT_SECTION_STYLE.diagnosis.label,
  ultrasound: VISIT_SECTION_STYLE.ultrasound.label,
  prescription: VISIT_SECTION_STYLE.prescription.label,
};

/** Maps print sections → consultation columns (Hiwet-style visit note). */
function sectionText(
  consultation: EncounterDetail["consultation"],
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

export function PrintVisitNote({
  encounter,
}: {
  encounter: EncounterDetail;
}) {
  const [open, setOpen] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<VisitNoteSection, boolean>>({
    vitals: true,
    notes: true,
    diagnosis: true,
    ultrasound: true,
    prescription: true,
  });

  const visitNumber = encounter.visitNumber ?? 1;
  const patient = encounter.patient;
  const c = encounter.consultation;

  useEffect(() => {
    let cancelled = false;
    void loadClinicLogoDataUrl().then((url) => {
      if (!cancelled) setLogoDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(key: VisitNoteSection) {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function sectionBlock(key: VisitNoteSection, body: string) {
    const style = VISIT_SECTION_STYLE[key];
    return `<div class="stack-section" style="border-left-color:${style.bar};background:${style.tint}">
      <h3 style="color:${style.title}"><span class="sec-icon">${style.icon}</span>${escapeHtml(style.label)}</h3>
      <pre>${escapeHtml(body || "—")}</pre>
    </div>`;
  }

  function sexIcon(sex: string) {
    const n = sex.replaceAll("_", " ").toLowerCase();
    if (n === "female") return "👩";
    if (n === "male") return "👨";
    return "👤";
  }

  function buildHtml(logoUrl: string | null = logoDataUrl) {
    const name = [patient.firstName, patient.middleName, patient.lastName]
      .filter(Boolean)
      .join(" ");
    const age = ageYears(patient.dateOfBirth);
    const dateStr = format(new Date(encounter.startedAt), "dd MMMM yyyy");
    const doctor = encounter.assignedDoctor
      ? `Dr. ${encounter.assignedDoctor.firstName} ${encounter.assignedDoctor.lastName}`
      : "";

    const order: VisitNoteSection[] = [
      "vitals",
      "notes",
      "diagnosis",
      "ultrasound",
      "prescription",
    ];
    const blocks = order
      .filter((key) => selected[key])
      .map((key) => sectionBlock(key, sectionText(c, key)));

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

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Visit ${visitNumber} — ${escapeHtml(name)}</title>
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
  .patient .label .ico.user { color: #7c3aed; filter: grayscale(0); }
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
          <span class="value">${escapeHtml(patient.phone ?? "—")}</span>
        </div>
        <div class="field">
          <span class="label"><span class="ico">${sexIcon(patient.sex)}</span> Sex</span>
          <span class="value">${escapeHtml(sexLabel)}</span>
        </div>
        <div class="field">
          <span class="label"><span class="ico">🎂</span> Age</span>
          <span class="value">${age != null ? age : "—"}</span>
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
    <p class="footer-meta">${escapeHtml(encounter.encounterNumber)}</p>
  </footer>
</body></html>`;
  }

  async function print() {
    const logoUrl = logoDataUrl ?? (await loadClinicLogoDataUrl());
    if (logoUrl && logoUrl !== logoDataUrl) setLogoDataUrl(logoUrl);
    const html = buildHtml(logoUrl);
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    // Give the popup a tick to paint the embedded logo before print.
    window.setTimeout(() => {
      w.print();
      setOpen(false);
    }, 80);
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Print visit note
      </Button>
      {open ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
          >
            <h3 className="text-base font-semibold text-slate-900">
              Print visit note
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Visit {visitNumber} — check sections to include from the visit
              note.
            </p>
            <ul className="mt-4 space-y-2">
              {(Object.keys(SECTION_LABEL) as VisitNoteSection[]).map((key) => (
                <li key={key}>
                  <label className="flex items-center gap-2 text-sm text-slate-800">
                    <input
                      type="checkbox"
                      checked={selected[key]}
                      onChange={() => toggle(key)}
                    />
                    {SECTION_LABEL[key]}
                    {!sectionText(c, key) ? (
                      <span className="text-[11px] text-slate-400">
                        (empty)
                      </span>
                    ) : null}
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button type="button" onClick={() => void print()}>
                Print / PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
