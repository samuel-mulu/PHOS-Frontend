"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Consultation } from "@/features/consultations/api";
import type { EncounterDetail } from "@/features/encounters/api";
import { loadClinicLogoDataUrl } from "@/lib/print/hiwet-brand";
import {
  buildMedicalCertificateHtml,
  type MedicalCertificateFormValues,
} from "@/lib/print/medical-certificate-html";

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

function diagnosisText(consultation: Consultation | null | undefined) {
  const labels = (consultation?.diagnoses ?? [])
    .slice()
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
    .map((d) => d.label)
    .filter(Boolean);
  if (labels.length) return labels.join("; ");
  return consultation?.assessment?.trim() ?? "";
}

function buildPrefill(
  encounter: EncounterDetail,
  consultation: Consultation | null | undefined,
): MedicalCertificateFormValues {
  return {
    cardNo: encounter.patient.patientNumber ?? "",
    date: format(new Date(), "yyyy-MM-dd"),
    name: patientName(encounter),
    admittedOn: encounter.startedAt
      ? format(new Date(encounter.startedAt), "yyyy-MM-dd")
      : "",
    diagnosis: diagnosisText(consultation),
    dischargedOn: encounter.closedAt
      ? format(new Date(encounter.closedAt), "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd"),
    recommendedRest: "",
    recommendations:
      consultation?.plan?.trim() || consultation?.notes?.trim() || "",
    doctorName: doctorLabel(encounter),
  };
}

export function PrintMedicalCertificate({
  encounter,
  consultation,
}: {
  encounter: EncounterDetail;
  consultation: Consultation | null | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [sheet, setSheet] = useState<MedicalCertificateFormValues>(() =>
    buildPrefill(encounter, consultation),
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
    setSheet(buildPrefill(encounter, consultation));
    setOpen(true);
  }

  function patch(field: keyof MedicalCertificateFormValues, value: string) {
    setSheet((prev) => ({ ...prev, [field]: value }));
  }

  async function print() {
    const logoUrl = logoDataUrl ?? (await loadClinicLogoDataUrl());
    if (logoUrl && logoUrl !== logoDataUrl) setLogoDataUrl(logoUrl);
    const html = buildMedicalCertificateHtml({
      sheet,
      encounterNumber: encounter.encounterNumber,
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
      <Button type="button" size="sm" onClick={openDialog}>
        Medical certificate
      </Button>
      {open ? (
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
                Medical certificate
              </h3>
              <p className="mt-1 text-xs text-muted">
                Patient-specific certificate. Prints with Hiwet header, services
                sidebar, and footer.
              </p>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="mc-card">Card No</Label>
                  <Input
                    id="mc-card"
                    value={sheet.cardNo}
                    onChange={(e) => patch("cardNo", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mc-date">Date</Label>
                  <Input
                    id="mc-date"
                    type="date"
                    value={sheet.date}
                    onChange={(e) => patch("date", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mc-name">Name</Label>
                <Input
                  id="mc-name"
                  value={sheet.name}
                  onChange={(e) => patch("name", e.target.value)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="mc-admitted">Admitted on</Label>
                  <Input
                    id="mc-admitted"
                    type="date"
                    value={sheet.admittedOn}
                    onChange={(e) => patch("admittedOn", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mc-discharged">Discharged on</Label>
                  <Input
                    id="mc-discharged"
                    type="date"
                    value={sheet.dischargedOn}
                    onChange={(e) => patch("dischargedOn", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mc-dx">Diagnosis</Label>
                <Textarea
                  id="mc-dx"
                  rows={2}
                  value={sheet.diagnosis}
                  onChange={(e) => patch("diagnosis", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mc-rest">Recommended rest</Label>
                <Input
                  id="mc-rest"
                  value={sheet.recommendedRest}
                  onChange={(e) => patch("recommendedRest", e.target.value)}
                  placeholder="e.g. 3 days, 1 week"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mc-rec">Doctor&apos;s recommendations</Label>
                <Textarea
                  id="mc-rec"
                  rows={4}
                  value={sheet.recommendations}
                  onChange={(e) => patch("recommendations", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mc-doctor">Doctor</Label>
                <Input
                  id="mc-doctor"
                  value={sheet.doctorName}
                  onChange={(e) => patch("doctorName", e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={() => void print()}>
                Print PDF
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
