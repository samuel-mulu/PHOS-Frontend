"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DoctorFamilyPlanningPanel } from "@/components/doctor/doctor-family-planning-panel";
import { DoctorMaternalHealthPanel } from "@/components/doctor/doctor-maternal-health-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClinicalNotesThread } from "@/components/shared/clinical-notes-thread";
import { PatientIdentityBar } from "@/components/shared/patient-identity-bar";
import { PaymentRequestPanel } from "@/components/shared/payment-request-panel";
import { LoadingBlock } from "@/components/shared/state-blocks";
import {
  useEncounter,
  useReturnFromNurse,
} from "@/features/encounters/hooks";
import { useRecordTriage, useTriage } from "@/features/triage/hooks";
import { triageSchema, type TriageFormValues } from "@/features/triage/schemas";
import { cn } from "@/lib/utils";

type TriageTab = "triage" | "maternal" | "familyPlanning";

export function TriageForm({ encounterId }: { encounterId: string }) {
  const router = useRouter();
  const encounter = useEncounter(encounterId);
  const existing = useTriage(encounterId);
  const record = useRecordTriage(encounterId);
  const returnNurse = useReturnFromNurse(encounterId);
  const [tab, setTab] = useState<TriageTab>("triage");
  const [returnNotes, setReturnNotes] = useState("");
  const isDoctorReferral = Boolean(encounter.data?.nurseReferralActive);

  const form = useForm<TriageFormValues>({
    resolver: zodResolver(triageSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (existing.data) {
      const t = existing.data as Record<string, unknown>;
      const yesNo = (v: unknown): "" | "yes" | "no" =>
        v === true ? "yes" : v === false ? "no" : "";
      form.reset({
        temperature: t.temperature != null ? String(t.temperature) : "",
        systolic: t.systolic != null ? String(t.systolic) : "",
        diastolic: t.diastolic != null ? String(t.diastolic) : "",
        heartRate: t.heartRate != null ? String(t.heartRate) : "",
        respiratoryRate:
          t.respiratoryRate != null ? String(t.respiratoryRate) : "",
        spo2: t.spo2 != null ? String(t.spo2) : "",
        weightKg: t.weightKg != null ? String(t.weightKg) : "",
        heightCm: t.heightCm != null ? String(t.heightCm) : "",
        painScore: t.painScore != null ? String(t.painScore) : "",
        bloodGlucoseMgDl:
          t.bloodGlucoseMgDl != null ? String(t.bloodGlucoseMgDl) : "",
        pregnancySuspected: yesNo(t.pregnancySuspected),
        mchNeeded: yesNo(t.mchNeeded),
        fpNeeded: yesNo(t.fpNeeded),
        notes: (t.notes as string) ?? "",
      });
    }
  }, [existing.data, form]);

  const bmi = useMemo(() => {
    const w = Number(form.watch("weightKg"));
    const h = Number(form.watch("heightCm"));
    if (!w || !h) return null;
    const m = h / 100;
    return (w / (m * m)).toFixed(1);
  }, [form.watch("weightKg"), form.watch("heightCm")]);

  if (encounter.isLoading) return <LoadingBlock label="Loading encounter" />;
  if (!encounter.data?.patient) return null;

  const patient = encounter.data.patient;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PatientIdentityBar
        patient={patient}
        encounterNumber={encounter.data.encounterNumber}
        encounterStatus={encounter.data.status}
      />

      {isDoctorReferral ? (
        <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-teal-900">
              From doctor — mid-visit referral
            </p>
            <p className="mt-0.5 text-xs text-teal-800">
              Read the clinical notes, complete Maternal / FP / vitals as needed,
              then return the patient to the doctor. Intake triage patients stay
              on the normal waiting list.
            </p>
          </div>
          <ClinicalNotesThread
            encounterId={encounterId}
            title="Doctor notes for nurse"
          />
          <div>
            <Label htmlFor="return-notes" className="text-xs">
              Optional note back to doctor
            </Label>
            <Textarea
              id="return-notes"
              className="mt-1"
              rows={2}
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              placeholder="What you did / findings…"
            />
          </div>
          <Button
            type="button"
            disabled={returnNurse.isPending}
            onClick={() =>
              returnNurse.mutate(returnNotes.trim() || undefined, {
                onSuccess: () => router.push("/nurse"),
              })
            }
          >
            {returnNurse.isPending ? "Returning…" : "Return to doctor"}
          </Button>
        </div>
      ) : null}

      <nav
        className="flex flex-nowrap gap-2 overflow-x-auto border-b border-border pb-2"
        aria-label="Triage workflow"
      >
        {(
          [
            ["triage", "Triage"],
            ["maternal", "Maternal"],
            ["familyPlanning", "FP"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={cn(
              "relative shrink-0 rounded-md px-3 py-1.5 text-sm font-medium",
              tab === id
                ? "bg-slate-200 text-slate-900 shadow-sm dark:bg-primary dark:text-white"
                : "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-muted-bg dark:text-foreground dark:ring-border dark:hover:bg-hover-strong",
            )}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <p className="text-xs text-muted">
        {tab === "triage"
          ? "Triage · Record vitals and MCH / FP flags, then complete triage."
          : tab === "maternal"
            ? "Maternal · Obstetric history, ANC, labor, and delivery for this patient."
            : "FP · Family planning counseling, method, and follow-up."}
      </p>

      {tab === "triage" ? (
        <>
          <form
            className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm"
            onSubmit={form.handleSubmit((values) => record.mutate(values))}
          >
            <h2 className="text-sm font-semibold text-foreground">Vitals</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              <VitalField
                label="Temp (°C)"
                error={form.formState.errors.temperature?.message}
              >
                <Input
                  type="number"
                  step="0.1"
                  {...form.register("temperature")}
                />
              </VitalField>
              <VitalField
                label="Systolic"
                error={form.formState.errors.systolic?.message}
              >
                <Input type="number" {...form.register("systolic")} />
              </VitalField>
              <VitalField
                label="Diastolic"
                error={form.formState.errors.diastolic?.message}
              >
                <Input type="number" {...form.register("diastolic")} />
              </VitalField>
              <VitalField
                label="Pulse"
                error={form.formState.errors.heartRate?.message}
              >
                <Input type="number" {...form.register("heartRate")} />
              </VitalField>
              <VitalField
                label="RR"
                error={form.formState.errors.respiratoryRate?.message}
              >
                <Input type="number" {...form.register("respiratoryRate")} />
              </VitalField>
              <VitalField
                label="SpO2 %"
                error={form.formState.errors.spo2?.message}
              >
                <Input type="number" {...form.register("spo2")} />
              </VitalField>
              <VitalField
                label="Weight (kg)"
                error={form.formState.errors.weightKg?.message}
              >
                <Input
                  type="number"
                  step="0.1"
                  {...form.register("weightKg")}
                />
              </VitalField>
              <VitalField
                label="Height (cm)"
                error={form.formState.errors.heightCm?.message}
              >
                <Input
                  type="number"
                  step="0.1"
                  {...form.register("heightCm")}
                />
              </VitalField>
              <VitalField
                label="Pain 0–10"
                error={form.formState.errors.painScore?.message}
              >
                <Input type="number" {...form.register("painScore")} />
              </VitalField>
              <VitalField
                label="Blood glucose (mg/dL)"
                error={form.formState.errors.bloodGlucoseMgDl?.message}
              >
                <Input type="number" {...form.register("bloodGlucoseMgDl")} />
              </VitalField>
            </div>
            {bmi ? (
              <p className="text-sm text-muted">BMI (approx.): {bmi}</p>
            ) : null}
            <div className="space-y-3 border-t border-border pt-4">
              <h2 className="text-sm font-semibold text-foreground">
                MCH / Family planning
              </h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <VitalField label="Pregnancy suspected">
                  <select
                    className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30"
                    {...form.register("pregnancySuspected")}
                  >
                    <option value="">—</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </VitalField>
                <VitalField label="MCH needed">
                  <select
                    className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30"
                    {...form.register("mchNeeded")}
                  >
                    <option value="">—</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </VitalField>
                <VitalField label="FP needed">
                  <select
                    className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30"
                    {...form.register("fpNeeded")}
                  >
                    <option value="">—</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </VitalField>
              </div>
            </div>
            <div>
              <Label className="mb-1 block">Notes</Label>
              <Textarea rows={3} {...form.register("notes")} />
            </div>
            <Button type="submit" disabled={record.isPending}>
              {record.isPending
                ? "Saving…"
                : isDoctorReferral
                  ? "Save vitals & return to doctor"
                  : "Complete triage"}
            </Button>
            <p className="text-xs text-muted">
              {isDoctorReferral
                ? "Saves vitals and returns this referral to the doctor queue."
                : "Submitting sends the patient to the doctor queue (intake triage)."}
            </p>
          </form>

          <PaymentRequestPanel
            encounterId={encounterId}
            returnStation="TRIAGE"
            title="Charge & send to cashier"
            disabled={encounter.data.status === "WAITING_PAYMENT"}
          />
        </>
      ) : null}

      {tab === "maternal" ? (
        <DoctorMaternalHealthPanel
          patientId={patient.id}
          encounterId={encounterId}
        />
      ) : null}

      {tab === "familyPlanning" ? (
        <DoctorFamilyPlanningPanel
          patientId={patient.id}
          encounterId={encounterId}
        />
      ) : null}
    </div>
  );
}

function VitalField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1 block text-xs">{label}</Label>
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
