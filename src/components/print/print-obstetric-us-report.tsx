"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Consultation } from "@/features/consultations/api";
import {
  parseObstetricUsReport,
  type ObstetricUsReportFormValues,
} from "@/features/consultations/obstetric-us-report";
import type { EncounterDetail } from "@/features/encounters/api";
import { usePatientMaternal } from "@/features/maternal/hooks";
import type { AncVisit } from "@/features/maternal/types";
import type { PatientChartEncounter } from "@/features/patients/api";
import { usePatientChart } from "@/features/patients/hooks";
import { ageYears } from "@/lib/format/age";
import { loadClinicLogoDataUrl } from "@/lib/print/hiwet-brand";
import { buildObstetricUsReportHtml } from "@/lib/print/obstetric-us-report-html";
import { toast } from "sonner";

function doctorLabelFromPerson(
  person?: { firstName: string; lastName: string } | null,
) {
  if (!person) return "";
  return `Dr. ${[person.firstName, person.lastName].filter(Boolean).join(" ")}`;
}

function patientName(encounter: EncounterDetail) {
  return [encounter.patient.firstName, encounter.patient.middleName, encounter.patient.lastName]
    .filter(Boolean)
    .join(" ");
}

function presentationLabel(value?: string | null) {
  if (!value) return "";
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function visitOptionLabel(enc: PatientChartEncounter, isCurrent: boolean) {
  const vn =
    enc.visitNumber != null ? `Visit ${enc.visitNumber}` : "Visit";
  const date = format(new Date(enc.startedAt), "dd MMM yyyy");
  const current = isCurrent ? " · this encounter" : "";
  return `${vn} · ${date}${current}`;
}

function buildPrefill(
  encounter: EncounterDetail,
  opts?: {
    anc?: AncVisit | null;
    doctor?: { firstName: string; lastName: string } | null;
    reportDate?: string | null;
  },
): ObstetricUsReportFormValues {
  const anc = opts?.anc ?? null;
  const age = ageYears(encounter.patient.dateOfBirth);
  const fhb =
    anc?.fetalHeartRate != null
      ? `FHB ${anc.fetalHeartRate}${anc.fetalMovement ? ` · movement ${anc.fetalMovement.toLowerCase()}` : ""}`
      : "";
  return {
    patientName: patientName(encounter),
    age: age != null ? String(age) : "",
    cardNo: encounter.patient.patientNumber ?? "",
    date: opts?.reportDate
      ? format(new Date(opts.reportDate), "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd"),
    numberOfFetus: "",
    viabilityFhb: fhb,
    fetalPresentation: presentationLabel(anc?.fetalPresentation),
    gsCrlBpdFlAga:
      anc?.gaWeeks != null
        ? `GA ${anc.gaWeeks}w${anc.gaDays != null ? `+${anc.gaDays}d` : ""}`
        : "",
    amnioticFluidVolume: "",
    placentalPositionGrade: "",
    estimatedFetalWeight: "",
    grossAnomaly: "",
    index: "",
    recommendation: anc?.ultrasoundFindings?.trim() || anc?.treatment?.trim() || "",
    doctorName: doctorLabelFromPerson(
      opts?.doctor ?? encounter.assignedDoctor,
    ),
  };
}

function ancForEncounter(
  visits: AncVisit[] | undefined,
  encounterId: string,
): AncVisit | null {
  const matched = (visits ?? []).filter((v) => v.encounterId === encounterId);
  if (!matched.length) return null;
  return [...matched].sort(
    (a, b) =>
      new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime(),
  )[0]!;
}

function storedReportForVisit(
  selectedId: string,
  currentEncounterId: string,
  consultation: Consultation | null | undefined,
  chartEncounters: PatientChartEncounter[] | undefined,
): ObstetricUsReportFormValues | null {
  if (selectedId === currentEncounterId) {
    return parseObstetricUsReport(consultation?.obstetricUsReport);
  }
  const fromChart = chartEncounters?.find((e) => e.id === selectedId);
  return parseObstetricUsReport(fromChart?.consultation?.obstetricUsReport);
}

export function PrintObstetricUsReport({
  encounter,
  consultation,
  onSave,
  saving,
  locked,
}: {
  encounter: EncounterDetail;
  consultation?: Consultation | null;
  onSave: (sheet: ObstetricUsReportFormValues) => Promise<void>;
  saving?: boolean;
  locked?: boolean;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedEncounterId, setSelectedEncounterId] = useState(encounter.id);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const chart = usePatientChart(open ? encounter.patient.id : "");
  const maternal = usePatientMaternal(open ? encounter.patient.id : "");

  async function refreshChart() {
    await queryClient.invalidateQueries({
      queryKey: ["patients", encounter.patient.id, "chart"],
    });
  }

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
              obstetricUsReport: consultation?.obstetricUsReport ?? null,
              diagnoses: encounter.consultation.diagnoses ?? [],
            }
          : consultation
            ? {
                obstetricUsReport: consultation.obstetricUsReport ?? null,
                diagnoses: consultation.diagnoses ?? [],
              }
            : null,
      } satisfies PatientChartEncounter,
    ];
  }, [chart.data?.encounters, encounter, consultation]);

  const isCurrentVisit = selectedEncounterId === encounter.id;
  const canEdit = isCurrentVisit && !locked;

  const selectedVisitMeta = useMemo(() => {
    if (isCurrentVisit) {
      return {
        startedAt: encounter.startedAt,
        encounterNumber: encounter.encounterNumber,
        assignedDoctor: encounter.assignedDoctor,
      };
    }
    const fromChart = chart.data?.encounters?.find(
      (e) => e.id === selectedEncounterId,
    );
    return {
      startedAt: fromChart?.startedAt ?? encounter.startedAt,
      encounterNumber: fromChart?.encounterNumber ?? encounter.encounterNumber,
      assignedDoctor: fromChart?.assignedDoctor ?? null,
    };
  }, [
    isCurrentVisit,
    encounter,
    chart.data?.encounters,
    selectedEncounterId,
  ]);

  const visitAnc = useMemo(
    () => ancForEncounter(maternal.data?.ancVisits, selectedEncounterId),
    [maternal.data?.ancVisits, selectedEncounterId],
  );

  const stored = useMemo(
    () =>
      storedReportForVisit(
        selectedEncounterId,
        encounter.id,
        consultation,
        chart.data?.encounters,
      ),
    [
      selectedEncounterId,
      encounter.id,
      consultation,
      chart.data?.encounters,
    ],
  );

  const currentVisitStored = useMemo(
    () => parseObstetricUsReport(consultation?.obstetricUsReport),
    [consultation?.obstetricUsReport],
  );

  const [sheet, setSheet] = useState<ObstetricUsReportFormValues>(() =>
    buildPrefill(encounter),
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

  useEffect(() => {
    if (open) setSelectedEncounterId(encounter.id);
  }, [open, encounter.id]);

  function loadSheetForVisit(visitId: string) {
    const report = storedReportForVisit(
      visitId,
      encounter.id,
      consultation,
      chart.data?.encounters,
    );
    if (report) {
      setSheet(report);
      return;
    }
    const isCurrent = visitId === encounter.id;
    const meta = isCurrent
      ? {
          startedAt: encounter.startedAt,
          assignedDoctor: encounter.assignedDoctor,
        }
      : {
          startedAt:
            chart.data?.encounters?.find((e) => e.id === visitId)?.startedAt ??
            encounter.startedAt,
          assignedDoctor:
            chart.data?.encounters?.find((e) => e.id === visitId)
              ?.assignedDoctor ?? null,
        };
    const anc = ancForEncounter(maternal.data?.ancVisits, visitId);
    setSheet(
      buildPrefill(encounter, {
        anc,
        doctor: meta.assignedDoctor,
        reportDate: meta.startedAt,
      }),
    );
  }

  function openDialog() {
    setSelectedEncounterId(encounter.id);
    const report = parseObstetricUsReport(consultation?.obstetricUsReport);
    if (report) {
      setSheet(report);
    } else {
      setSheet(
        buildPrefill(encounter, {
          anc: ancForEncounter(maternal.data?.ancVisits, encounter.id),
          doctor: encounter.assignedDoctor,
          reportDate: encounter.startedAt,
        }),
      );
    }
    setOpen(true);
  }

  function onVisitChange(visitId: string) {
    setSelectedEncounterId(visitId);
    loadSheetForVisit(visitId);
  }

  function fillFromVisitAnc() {
    setSheet(
      buildPrefill(encounter, {
        anc: visitAnc,
        doctor: selectedVisitMeta.assignedDoctor,
        reportDate: selectedVisitMeta.startedAt,
      }),
    );
  }

  function patch(field: keyof ObstetricUsReportFormValues, value: string) {
    setSheet((prev) => ({ ...prev, [field]: value }));
  }

  async function printSheet() {
    const logoUrl = logoDataUrl ?? (await loadClinicLogoDataUrl());
    if (logoUrl && logoUrl !== logoDataUrl) setLogoDataUrl(logoUrl);
    const html = buildObstetricUsReportHtml({
      sheet,
      encounterNumber: selectedVisitMeta.encounterNumber,
      logoUrl,
    });
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) {
      toast.error("Allow pop-ups to print the report");
      return false;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    window.setTimeout(() => w.print(), 80);
    return true;
  }

  async function saveOnly() {
    if (!canEdit) return;
    try {
      await onSave(sheet);
      await refreshChart();
      setOpen(false);
    } catch {
      // The save mutation already shows the error.
    }
  }

  async function saveAndPrint() {
    if (!canEdit) return;
    try {
      await onSave(sheet);
      await refreshChart();
    } catch {
      return;
    }
    await printSheet();
    setOpen(false);
  }

  return (
    <div className="relative flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" onClick={openDialog}>
        Obstetric U/S
      </Button>
      {currentVisitStored ? (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-2xs font-semibold text-emerald-900">
          Saved
        </span>
      ) : null}
      {open
        ? createPortal(
            <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
              <button
                type="button"
                className="absolute inset-0 bg-black/55"
                aria-label="Close"
                onClick={() => setOpen(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-xl border border-border bg-card text-foreground shadow-xl sm:rounded-lg"
              >
                <div className="border-b border-border px-5 py-4">
                  <h3 className="text-base font-semibold text-foreground">
                    Obstetric U/S report
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    {isCurrentVisit
                      ? stored
                        ? "Loaded from the saved report for this visit. Edit the fields, then save again. Ultrasound notes stay separate and can still be edited."
                        : "Fill measurements for this visit. Save only stores the report on this visit. Save & print stores it, then prints that copy."
                      : stored
                        ? "Viewing the saved report for a past visit. Printing does not change other visits."
                        : "No saved report for this past visit. You can still print a draft; saving is only allowed on the current visit."}
                  </p>

                  <div className="mt-3 space-y-1.5">
                    <Label htmlFor="us-visit-select">Visit</Label>
                    <select
                      id="us-visit-select"
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                      value={selectedEncounterId}
                      disabled={chart.isLoading && !chart.data}
                      onChange={(e) => onVisitChange(e.target.value)}
                    >
                      {visitOptions.map((enc) => (
                        <option key={enc.id} value={enc.id}>
                          {visitOptionLabel(enc, enc.id === encounter.id)}
                          {storedReportForVisit(
                            enc.id,
                            encounter.id,
                            consultation,
                            chart.data?.encounters,
                          )
                            ? " · saved"
                            : ""}
                        </option>
                      ))}
                    </select>
                    {chart.isLoading && !chart.data ? (
                      <p className="text-2xs text-slate-500">Loading visits…</p>
                    ) : null}
                  </div>

                  {visitAnc && canEdit ? (
                    <div className="mt-3">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={fillFromVisitAnc}
                      >
                        Prefill from this visit&apos;s ANC
                      </Button>
                    </div>
                  ) : null}
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 text-sm">
                  <div className="space-y-1.5">
                    <Label htmlFor="us-name">Patient name</Label>
                    <Input
                      id="us-name"
                      disabled={!canEdit}
                      value={sheet.patientName}
                      onChange={(e) => patch("patientName", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="us-age">Age</Label>
                      <Input
                        id="us-age"
                        disabled={!canEdit}
                        value={sheet.age}
                        onChange={(e) => patch("age", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="us-card">Card No</Label>
                      <Input
                        id="us-card"
                        disabled={!canEdit}
                        value={sheet.cardNo}
                        onChange={(e) => patch("cardNo", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="us-date">Date</Label>
                      <Input
                        id="us-date"
                        type="date"
                        disabled={!canEdit}
                        value={sheet.date}
                        onChange={(e) => patch("date", e.target.value)}
                      />
                    </div>
                  </div>
                  {(
                    [
                      ["numberOfFetus", "Number of fetus"],
                      ["viabilityFhb", "Viability / FHB"],
                      ["fetalPresentation", "Fetal presentation"],
                      ["gsCrlBpdFlAga", "Gs, CRL, BPD, FL, AGA"],
                      ["amnioticFluidVolume", "Amniotic fluid volume"],
                      ["placentalPositionGrade", "Placental position and grade"],
                      ["estimatedFetalWeight", "Estimated fetal weight"],
                      ["grossAnomaly", "Evidence of gross anomaly"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <Label htmlFor={`us-${key}`}>{label}</Label>
                      <Input
                        id={`us-${key}`}
                        disabled={!canEdit}
                        value={sheet[key]}
                        onChange={(e) => patch(key, e.target.value)}
                      />
                    </div>
                  ))}
                  <div className="space-y-1.5">
                    <Label htmlFor="us-index">Index</Label>
                    <Textarea
                      id="us-index"
                      rows={3}
                      disabled={!canEdit}
                      value={sheet.index}
                      onChange={(e) => patch("index", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="us-rec">Recommendation</Label>
                    <Textarea
                      id="us-rec"
                      rows={3}
                      disabled={!canEdit}
                      value={sheet.recommendation}
                      onChange={(e) => patch("recommendation", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="us-doctor">Name &amp; sign</Label>
                    <Input
                      id="us-doctor"
                      disabled={!canEdit}
                      value={sheet.doctorName}
                      onChange={(e) => patch("doctorName", e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  {canEdit ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={saving}
                        onClick={() => void saveOnly()}
                      >
                        {saving ? "Saving…" : "Save only"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={saving}
                        onClick={() => void saveAndPrint()}
                      >
                        {saving ? "Saving…" : "Save & print"}
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void printSheet()}
                    >
                      {stored ? "Print saved report" : "Print"}
                    </Button>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
