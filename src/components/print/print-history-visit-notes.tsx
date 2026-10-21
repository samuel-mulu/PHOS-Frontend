"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PatientChartEncounter } from "@/features/patients/api";
import type { Patient } from "@/types/patient";
import { loadClinicLogoDataUrl } from "@/lib/print/hiwet-brand";
import {
  buildCombinedVisitNotesHtml,
  DEFAULT_VISIT_NOTE_SECTIONS,
  visitNoteSectionText,
  VISIT_NOTE_SECTION_LABEL,
  type VisitNoteSection,
} from "@/lib/print/visit-note-html";

function encounterHasSectionContent(
  enc: PatientChartEncounter,
  key: VisitNoteSection,
): boolean {
  return Boolean(visitNoteSectionText(enc.consultation ?? null, key));
}

export function PrintHistoryVisitNotesDialog({
  patient,
  encounters,
  onClose,
}: {
  patient: Patient;
  encounters: PatientChartEncounter[];
  onClose: () => void;
}) {
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<VisitNoteSection, boolean>>({
    ...DEFAULT_VISIT_NOTE_SECTIONS,
  });

  const sorted = useMemo(
    () =>
      [...encounters].sort((a, b) => {
        const vn = (a.visitNumber ?? 0) - (b.visitNumber ?? 0);
        if (vn !== 0) return vn;
        return new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
      }),
    [encounters],
  );

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

  const anySectionSelected = Object.values(selected).some(Boolean);

  async function print() {
    if (!anySectionSelected) return;
    const logoUrl = logoDataUrl ?? (await loadClinicLogoDataUrl());
    if (logoUrl && logoUrl !== logoDataUrl) setLogoDataUrl(logoUrl);
    const html = buildCombinedVisitNotesHtml({
      patient,
      encounters: sorted.map((enc) => ({
        visitNumber: enc.visitNumber,
        startedAt: enc.startedAt,
        encounterNumber: enc.encounterNumber,
        assignedDoctor: enc.assignedDoctor,
        consultation: enc.consultation,
      })),
      selected,
      logoUrl,
    });
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    window.setTimeout(() => {
      w.print();
      onClose();
    }, 80);
  }

  const visitLabel =
    sorted.length === 1
      ? `Visit ${sorted[0]?.visitNumber ?? 1}`
      : `${sorted.length} visits`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
      >
        <h3 className="text-base font-semibold text-slate-900">
          Print visit notes
        </h3>
        <p className="mt-1 text-xs text-slate-600">
          {visitLabel} - same sections apply to each selected visit. Each visit
          starts on a new page.
        </p>
        <ul className="mt-4 space-y-2">
          {(Object.keys(VISIT_NOTE_SECTION_LABEL) as VisitNoteSection[]).map(
            (key) => {
              const anyContent = sorted.some((enc) =>
                encounterHasSectionContent(enc, key),
              );
              return (
                <li key={key}>
                  <label className="flex items-center gap-2 text-sm text-slate-800">
                    <input
                      type="checkbox"
                      checked={selected[key]}
                      onChange={() => toggle(key)}
                    />
                    {VISIT_NOTE_SECTION_LABEL[key]}
                    {!anyContent ? (
                      <span className="text-[11px] text-slate-400">
                        (empty for selection)
                      </span>
                    ) : null}
                  </label>
                </li>
              );
            },
          )}
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!anySectionSelected}
            onClick={() => void print()}
          >
            Print / PDF
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
