"use client";

import { useState } from "react";
import { format, differenceInYears } from "date-fns";
import { Button } from "@/components/ui/button";
import type { EncounterDetail } from "@/features/encounters/api";
import { useWorkspaceContext } from "@/features/facilities/hooks";

export type VisitNoteSection =
  | "vitals"
  | "notes"
  | "diagnosis"
  | "ultrasound"
  | "prescription";

const SECTION_LABEL: Record<VisitNoteSection, string> = {
  vitals: "Vitals",
  notes: "Medical notes",
  diagnosis: "Diagnosis",
  ultrasound: "Ultrasound",
  prescription: "Prescription",
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

function ageYears(dob: string | null | undefined): number | null {
  if (!dob) return null;
  return differenceInYears(new Date(), new Date(dob));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function PrintVisitNote({
  encounter,
}: {
  encounter: EncounterDetail;
}) {
  const { facilityName } = useWorkspaceContext(null);
  const [open, setOpen] = useState(false);
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

  function toggle(key: VisitNoteSection) {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function section(title: string, body: string) {
    return `<div class="section"><h3>${escapeHtml(title)}</h3><pre>${escapeHtml(body || "—")}</pre></div>`;
  }

  function buildHtml() {
    const name = [patient.firstName, patient.middleName, patient.lastName]
      .filter(Boolean)
      .join(" ");
    const age = ageYears(patient.dateOfBirth);
    const clinic = facilityName || "Hiwet Clinic";
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
      .map((key) => section(SECTION_LABEL[key], sectionText(c, key)));

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Visit ${visitNumber} — ${escapeHtml(name)}</title>
<style>
  @page { margin: 16mm; }
  body { font-family: "Segoe UI", system-ui, sans-serif; color: #0f172a; margin: 0; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 16px; }
  .brand { font-size: 22px; font-weight: 700; color: #0f766e; }
  .sub { font-size: 12px; color: #64748b; margin-top: 4px; }
  .date { font-size: 13px; color: #334155; }
  .patient { border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px 16px; background: #f8fafc; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 20px; font-size: 13px; }
  .patient strong { color: #0f766e; }
  .badge { display: inline-block; background: #0f766e; color: #fff; border-radius: 999px; padding: 2px 10px; font-size: 11px; font-weight: 700; }
  .section { margin-bottom: 16px; }
  .section h3 { margin: 0 0 6px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: #0f766e; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  .section pre { margin: 0; white-space: pre-wrap; font-family: inherit; font-size: 13px; line-height: 1.45; }
  .sigs { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 48px; }
  .sig-line { border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 12px; color: #64748b; }
  .footer { margin-top: 32px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
</style></head><body>
  <div class="header">
    <div>
      <div class="brand">${escapeHtml(clinic)}</div>
      <div class="sub">Your trusted partner in healthcare</div>
    </div>
    <div class="date">${escapeHtml(dateStr)}<br/><span class="badge">Visit ${visitNumber}</span></div>
  </div>
  <div class="patient">
    <div><strong>Patient</strong><br/>${escapeHtml(name)}</div>
    <div><strong>Phone</strong><br/>${escapeHtml(patient.phone ?? "—")}</div>
    <div><strong>Sex</strong><br/>${escapeHtml(patient.sex.replaceAll("_", " "))}</div>
    <div><strong>Age</strong><br/>${age != null ? age : "—"}</div>
  </div>
  ${blocks.join("")}
  <div class="sigs">
    <div class="sig-line">Doctor signature${doctor ? ` — ${escapeHtml(doctor)}` : ""}</div>
    <div class="sig-line">Clinic stamp</div>
  </div>
  <div class="footer">${escapeHtml(clinic)} · Visit note · ${escapeHtml(encounter.encounterNumber)}</div>
</body></html>`;
  }

  function print() {
    const html = buildHtml();
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
    setOpen(false);
  }

  return (
    <div className="relative">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
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
                      <span className="text-[11px] text-slate-400">(empty)</span>
                    ) : null}
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button type="button" onClick={print}>
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
