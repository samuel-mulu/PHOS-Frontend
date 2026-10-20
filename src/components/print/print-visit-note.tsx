"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { EncounterDetail } from "@/features/encounters/api";
import type { PatientChartEncounter } from "@/features/patients/api";
import { usePatientChart } from "@/features/patients/hooks";
import { loadClinicLogoDataUrl } from "@/lib/print/hiwet-brand";
import {
  buildVisitNoteHtml,
  DEFAULT_VISIT_NOTE_SECTIONS,
  visitNoteSectionText,
  VISIT_NOTE_SECTION_LABEL,
  type VisitNoteConsultation,
  type VisitNoteEncounterSource,
  type VisitNoteSection,
} from "@/lib/print/visit-note-html";

export type { VisitNoteSection };

function chartEncounterToPrintSource(
  enc: PatientChartEncounter,
): VisitNoteEncounterSource {
  return {
    visitNumber: enc.visitNumber,
    startedAt: enc.startedAt,
    encounterNumber: enc.encounterNumber,
    assignedDoctor: enc.assignedDoctor,
    consultation: enc.consultation ?? null,
  };
}

function currentEncounterToPrintSource(
  encounter: EncounterDetail,
): VisitNoteEncounterSource {
  return {
    visitNumber: encounter.visitNumber,
    startedAt: encounter.startedAt,
    encounterNumber: encounter.encounterNumber,
    assignedDoctor: encounter.assignedDoctor,
    consultation: encounter.consultation,
  };
}

function consultationForSections(
  encounter: EncounterDetail,
  selectedId: string,
  chartEncounters: PatientChartEncounter[] | undefined,
): VisitNoteConsultation {
  if (selectedId === encounter.id) {
    return encounter.consultation;
  }
  const fromChart = chartEncounters?.find((e) => e.id === selectedId);
  return fromChart?.consultation ?? null;
}

function printSourceForVisit(
  encounter: EncounterDetail,
  selectedId: string,
  chartEncounters: PatientChartEncounter[] | undefined,
): VisitNoteEncounterSource {
  if (selectedId === encounter.id) {
    return currentEncounterToPrintSource(encounter);
  }
  const fromChart = chartEncounters?.find((e) => e.id === selectedId);
  if (fromChart) return chartEncounterToPrintSource(fromChart);
  return currentEncounterToPrintSource(encounter);
}

function visitOptionLabel(enc: PatientChartEncounter, isCurrent: boolean) {
  const vn =
    enc.visitNumber != null ? `Visit ${enc.visitNumber}` : "Visit";
  const date = format(new Date(enc.startedAt), "dd MMM yyyy");
  const current = isCurrent ? " · this encounter" : "";
  return `${vn} · ${date}${current}`;
}

export function PrintVisitNote({
  encounter,
}: {
  encounter: EncounterDetail;
}) {
  const patient = encounter.patient;
  const [open, setOpen] = useState(false);
  const [selectedEncounterId, setSelectedEncounterId] = useState(encounter.id);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<VisitNoteSection, boolean>>({
    ...DEFAULT_VISIT_NOTE_SECTIONS,
  });

  const chart = usePatientChart(open ? patient.id : "");

  const visitOptions = useMemo(() => {
    const fromChart = chart.data?.encounters ?? [];
    if (fromChart.length > 0) {
      return [...fromChart].sort((a, b) => {
        const vn = (a.visitNumber ?? 0) - (b.visitNumber ?? 0);
        if (vn !== 0) return vn;
        return (
          new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
        );
      });
    }
    return [
      {
        id: encounter.id,
        visitNumber: encounter.visitNumber,
        startedAt: encounter.startedAt,
        encounterNumber: encounter.encounterNumber,
        type: encounter.type,
        status: encounter.status,
        assignedDoctor: encounter.assignedDoctor,
        consultation: encounter.consultation
          ? {
              ...encounter.consultation,
              diagnoses: encounter.consultation.diagnoses ?? [],
            }
          : null,
      },
    ];
  }, [chart.data?.encounters, encounter]);

  const selectedPrintSource = printSourceForVisit(
    encounter,
    selectedEncounterId,
    chart.data?.encounters,
  );
  const consultation = consultationForSections(
    encounter,
    selectedEncounterId,
    chart.data?.encounters,
  );
  const visitNumber = selectedPrintSource.visitNumber ?? 1;

  useEffect(() => {
    let cancelled = false;
    void loadClinicLogoDataUrl().then((url) => {
      if (!cancelled) setLogoDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (open) setSelectedEncounterId(encounter.id);
  }, [open, encounter.id]);

  function openDialog() {
    setSelectedEncounterId(encounter.id);
    setOpen(true);
  }

  function toggle(key: VisitNoteSection) {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function print() {
    const logoUrl = logoDataUrl ?? (await loadClinicLogoDataUrl());
    if (logoUrl && logoUrl !== logoDataUrl) setLogoDataUrl(logoUrl);
    const html = buildVisitNoteHtml({
      patient,
      encounter: selectedPrintSource,
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
      setOpen(false);
    }, 80);
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={openDialog}
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
              Choose which visit to print. Sections reflect that visit&apos;s
              saved consultation notes.
            </p>

            <div className="mt-4 space-y-1.5">
              <Label htmlFor="print-visit-select">Visit</Label>
              <select
                id="print-visit-select"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                value={selectedEncounterId}
                disabled={chart.isLoading && !chart.data}
                onChange={(e) => setSelectedEncounterId(e.target.value)}
              >
                {visitOptions.map((enc) => (
                  <option key={enc.id} value={enc.id}>
                    {visitOptionLabel(enc, enc.id === encounter.id)}
                  </option>
                ))}
              </select>
              {chart.isLoading && !chart.data ? (
                <p className="text-[11px] text-slate-500">Loading visits…</p>
              ) : null}
            </div>

            <ul className="mt-4 space-y-2">
              {(Object.keys(VISIT_NOTE_SECTION_LABEL) as VisitNoteSection[]).map(
                (key) => (
                  <li key={key}>
                    <label className="flex items-center gap-2 text-sm text-slate-800">
                      <input
                        type="checkbox"
                        checked={selected[key]}
                        onChange={() => toggle(key)}
                      />
                      {VISIT_NOTE_SECTION_LABEL[key]}
                      {!visitNoteSectionText(consultation, key) ? (
                        <span className="text-[11px] text-slate-400">
                          (empty)
                        </span>
                      ) : null}
                    </label>
                  </li>
                ),
              )}
            </ul>
            <p className="mt-2 text-[11px] text-slate-500">
              Printing visit {visitNumber}. Unsaved notes on this screen are not
              included until you save the consultation.
            </p>
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
