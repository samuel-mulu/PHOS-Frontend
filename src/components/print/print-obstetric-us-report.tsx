"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
import { ageYears } from "@/lib/format/age";
import { loadClinicLogoDataUrl } from "@/lib/print/hiwet-brand";
import { buildObstetricUsReportHtml } from "@/lib/print/obstetric-us-report-html";
import { toast } from "sonner";

function doctorLabel(encounter: EncounterDetail) {
  const d = encounter.assignedDoctor;
  if (!d) return "";
  return `Dr. ${[d.firstName, d.lastName].filter(Boolean).join(" ")}`;
}

function patientName(encounter: EncounterDetail) {
  return [encounter.patient.firstName, encounter.patient.middleName, encounter.patient.lastName]
    .filter(Boolean)
    .join(" ");
}

function presentationLabel(value?: string | null) {
  if (!value) return "";
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function buildPrefill(
  encounter: EncounterDetail,
  anc?: AncVisit | null,
): ObstetricUsReportFormValues {
  const age = ageYears(encounter.patient.dateOfBirth);
  const fhb =
    anc?.fetalHeartRate != null
      ? `FHB ${anc.fetalHeartRate}${anc.fetalMovement ? ` · movement ${anc.fetalMovement.toLowerCase()}` : ""}`
      : "";
  return {
    patientName: patientName(encounter),
    age: age != null ? String(age) : "",
    cardNo: encounter.patient.patientNumber ?? "",
    date: format(new Date(), "yyyy-MM-dd"),
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
    doctorName: doctorLabel(encounter),
  };
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
  const [open, setOpen] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const maternal = usePatientMaternal(open ? encounter.patient.id : "");
  const latestAnc = useMemo(() => {
    const visits = maternal.data?.ancVisits ?? [];
    if (!visits.length) return null;
    return [...visits].sort(
      (a, b) =>
        new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime(),
    )[0]!;
  }, [maternal.data?.ancVisits]);

  const stored = useMemo(
    () => parseObstetricUsReport(consultation?.obstetricUsReport),
    [consultation?.obstetricUsReport],
  );

  const [sheet, setSheet] = useState<ObstetricUsReportFormValues>(() =>
    buildPrefill(encounter, null),
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

  function openDialog() {
    setSheet(stored ?? buildPrefill(encounter, null));
    setOpen(true);
  }

  function fillFromAnc() {
    setSheet(buildPrefill(encounter, latestAnc));
  }

  function patch(field: keyof ObstetricUsReportFormValues, value: string) {
    setSheet((prev) => ({ ...prev, [field]: value }));
  }

  async function printSheet() {
    const logoUrl = logoDataUrl ?? (await loadClinicLogoDataUrl());
    if (logoUrl && logoUrl !== logoDataUrl) setLogoDataUrl(logoUrl);
    const html = buildObstetricUsReportHtml({
      sheet,
      encounterNumber: encounter.encounterNumber,
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
    try {
      await onSave(sheet);
      setOpen(false);
    } catch {
      // The save mutation already shows the error.
    }
  }

  async function saveAndPrint() {
    try {
      await onSave(sheet);
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
      {stored ? (
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
                {stored
                  ? "Loaded from the saved report for this visit. Edit the fields, then save again. Ultrasound notes stay separate and can still be edited."
                  : "Fill measurements for this visit. Save only stores the report. Save & print stores it, then prints that copy."}
              </p>
              {latestAnc && !locked ? (
                <div className="mt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={fillFromAnc}
                  >
                    Prefill from latest ANC
                  </Button>
                </div>
              ) : null}
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 text-sm">
              <div className="space-y-1.5">
                <Label htmlFor="us-name">Patient name</Label>
                  <Input
                    id="us-name"
                    disabled={locked}
                    value={sheet.patientName}
                    onChange={(e) => patch("patientName", e.target.value)}
                  />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="us-age">Age</Label>
                  <Input
                    id="us-age"
                    disabled={locked}
                    value={sheet.age}
                    onChange={(e) => patch("age", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="us-card">Card No</Label>
                  <Input
                    id="us-card"
                    disabled={locked}
                    value={sheet.cardNo}
                    onChange={(e) => patch("cardNo", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="us-date">Date</Label>
                  <Input
                    id="us-date"
                    type="date"
                    disabled={locked}
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
                    disabled={locked}
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
                  disabled={locked}
                  value={sheet.index}
                  onChange={(e) => patch("index", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="us-rec">Recommendation</Label>
                <Textarea
                  id="us-rec"
                  rows={3}
                  disabled={locked}
                  value={sheet.recommendation}
                  onChange={(e) => patch("recommendation", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="us-doctor">Name &amp; sign</Label>
                <Input
                  id="us-doctor"
                  disabled={locked}
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
              {locked ? (
                <Button type="button" size="sm" onClick={() => void printSheet()}>
                  {stored ? "Print saved report" : "Print"}
                </Button>
              ) : (
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
