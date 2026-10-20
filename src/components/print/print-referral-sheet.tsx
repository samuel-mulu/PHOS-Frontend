"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SuggestingInput,
  SuggestingTextarea,
} from "@/components/shared/suggesting-field";
import type { FieldMemoryKey } from "@/lib/field-memory/keys";
import type { Consultation } from "@/features/consultations/api";
import {
  buildReferralPrefill,
  parseReferralSheet,
  patientAgeSex,
  type ReferralSheetFormValues,
} from "@/features/consultations/referral-sheet";
import type { EncounterDetail } from "@/features/encounters/api";
import { ageYears } from "@/lib/format/age";
import { loadClinicLogoDataUrl } from "@/lib/print/hiwet-brand";
import { buildReferralSheetHtml } from "@/lib/print/referral-sheet-html";

const EMPTY_REFERRAL: ReferralSheetFormValues = {
  referTo: "",
  referralDate: "",
  healthProblemIdentification: "",
  physicalFinding: "",
  laboratoryTests: "",
  tentativeDx: "",
  actionTaken: "",
  reasonForReferral: "",
  referredBy: "",
  referredDate: "",
  feedback: "",
};

export function PrintReferralSheet({
  encounter,
  consultation,
  laboratoryTestsSummary,
  onSave,
  saving,
}: {
  encounter: EncounterDetail;
  consultation: Consultation | null | undefined;
  laboratoryTestsSummary: string;
  onSave: (referralSheet: ReferralSheetFormValues) => Promise<void>;
  saving?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [sheet, setSheet] = useState<ReferralSheetFormValues>(EMPTY_REFERRAL);

  const stored = useMemo(
    () => parseReferralSheet(consultation?.referralSheet),
    [consultation?.referralSheet],
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
    if (stored) {
      setSheet(stored);
    } else {
      setSheet(
        buildReferralPrefill({
          encounter,
          consultation,
          laboratoryTests: laboratoryTestsSummary,
        }),
      );
    }
    setOpen(true);
  }

  function prefillFromVisit() {
    setSheet(
      buildReferralPrefill({
        encounter,
        consultation,
        laboratoryTests: laboratoryTestsSummary,
      }),
    );
  }

  function patch(field: keyof ReferralSheetFormValues, value: string) {
    setSheet((prev) => ({ ...prev, [field]: value }));
  }

  async function print() {
    const logoUrl = logoDataUrl ?? (await loadClinicLogoDataUrl());
    if (logoUrl && logoUrl !== logoDataUrl) setLogoDataUrl(logoUrl);
    const age = ageYears(encounter.patient.dateOfBirth);
    const html = buildReferralSheetHtml({
      patient: encounter.patient,
      age,
      sheet,
      encounterNumber: encounter.encounterNumber,
      logoUrl,
    });
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    window.setTimeout(() => w.print(), 80);
  }

  async function saveAndPrint() {
    await onSave(sheet);
    await print();
    setOpen(false);
  }

  const { age, sex } = patientAgeSex(encounter);
  const patientName = [
    encounter.patient.firstName,
    encounter.patient.middleName,
    encounter.patient.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="relative">
      <Button type="button" variant="outline" size="sm" onClick={openDialog}>
        Referral sheet
      </Button>
      {open ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-xl bg-white shadow-xl sm:rounded-lg"
          >
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">
                Referral sheet
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                Fill in referral details for{" "}
                <span className="font-medium">{patientName}</span>
                {age != null ? ` · ${age} yrs` : ""} · {sex}. Prints with the
                same Hiwet header, services sidebar, and footer as visit notes.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={prefillFromVisit}
                >
                  Fill from this visit
                </Button>
              </div>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="refer-to">Refer to</Label>
                  <SuggestingInput
                    fieldKey="referral.referTo"
                    id="refer-to"
                    value={sheet.referTo ?? ""}
                    onChange={(e) => patch("referTo", e.target.value)}
                    placeholder="Hospital, specialist, or facility"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="referral-date">Referral date</Label>
                  <Input
                    id="referral-date"
                    type="date"
                    value={sheet.referralDate ?? ""}
                    onChange={(e) => patch("referralDate", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="referred-date">Referred by (signature) date</Label>
                  <Input
                    id="referred-date"
                    type="date"
                    value={sheet.referredDate ?? ""}
                    onChange={(e) => patch("referredDate", e.target.value)}
                  />
                </div>
              </div>

              <Field
                fieldKey="referral.healthProblemIdentification"
                id="health-problem"
                label="Health problem identification"
                value={sheet.healthProblemIdentification ?? ""}
                onChange={(v) => patch("healthProblemIdentification", v)}
                rows={4}
              />
              <Field
                fieldKey="referral.physicalFinding"
                id="physical-finding"
                label="Physical finding"
                value={sheet.physicalFinding ?? ""}
                onChange={(v) => patch("physicalFinding", v)}
                rows={3}
              />
              <Field
                fieldKey="referral.laboratoryTests"
                id="lab-tests"
                label="Laboratory tests"
                value={sheet.laboratoryTests ?? ""}
                onChange={(v) => patch("laboratoryTests", v)}
                rows={2}
              />
              <Field
                fieldKey="referral.tentativeDx"
                id="tentative-dx"
                label="Tentative Dx"
                value={sheet.tentativeDx ?? ""}
                onChange={(v) => patch("tentativeDx", v)}
                rows={2}
              />
              <Field
                fieldKey="referral.actionTaken"
                id="action-taken"
                label="Action taken"
                value={sheet.actionTaken ?? ""}
                onChange={(v) => patch("actionTaken", v)}
                rows={2}
              />
              <Field
                fieldKey="referral.reasonForReferral"
                id="reason"
                label="Reason for referral"
                value={sheet.reasonForReferral ?? ""}
                onChange={(v) => patch("reasonForReferral", v)}
                rows={2}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="referred-by">Referred by</Label>
                  <SuggestingInput
                    fieldKey="referral.referredBy"
                    id="referred-by"
                    value={sheet.referredBy ?? ""}
                    onChange={(e) => patch("referredBy", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="feedback">Please give us feedback</Label>
                  <SuggestingInput
                    fieldKey="referral.feedback"
                    id="feedback"
                    value={sheet.feedback ?? ""}
                    onChange={(e) => patch("feedback", e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-slate-200 px-5 py-4">
              <Button
                type="button"
                disabled={saving}
                onClick={() => void saveAndPrint()}
              >
                Save &amp; print
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void print()}
              >
                Print preview
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => void onSave(sheet).then(() => setOpen(false))}
              >
                Save only
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  fieldKey,
  id,
  label,
  value,
  onChange,
  rows = 3,
}: {
  fieldKey: FieldMemoryKey;
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <SuggestingTextarea
        fieldKey={fieldKey}
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="resize-y"
      />
    </div>
  );
}
