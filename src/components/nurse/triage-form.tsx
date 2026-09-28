"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PatientIdentityBar } from "@/components/shared/patient-identity-bar";
import { LoadingBlock } from "@/components/shared/state-blocks";
import { useEncounter } from "@/features/encounters/hooks";
import { useRecordTriage, useTriage } from "@/features/triage/hooks";
import { triageSchema, type TriageFormValues } from "@/features/triage/schemas";

export function TriageForm({ encounterId }: { encounterId: string }) {
  const encounter = useEncounter(encounterId);
  const existing = useTriage(encounterId);
  const record = useRecordTriage(encounterId);

  const form = useForm<TriageFormValues>({
    resolver: zodResolver(triageSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (existing.data) {
      const t = existing.data as Record<string, unknown>;
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
    <div className="mx-auto max-w-3xl space-y-4">
      <PatientIdentityBar
        patient={patient}
        encounterNumber={encounter.data.encounterNumber}
        encounterStatus={encounter.data.status}
      />
      <form
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        onSubmit={form.handleSubmit((values) => record.mutate(values))}
      >
        <h2 className="text-sm font-semibold text-slate-800">Vitals</h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <VitalField label="Temp (°C)" error={form.formState.errors.temperature?.message}>
            <Input type="number" step="0.1" {...form.register("temperature")} />
          </VitalField>
          <VitalField label="Systolic" error={form.formState.errors.systolic?.message}>
            <Input type="number" {...form.register("systolic")} />
          </VitalField>
          <VitalField label="Diastolic" error={form.formState.errors.diastolic?.message}>
            <Input type="number" {...form.register("diastolic")} />
          </VitalField>
          <VitalField label="Pulse" error={form.formState.errors.heartRate?.message}>
            <Input type="number" {...form.register("heartRate")} />
          </VitalField>
          <VitalField label="RR" error={form.formState.errors.respiratoryRate?.message}>
            <Input type="number" {...form.register("respiratoryRate")} />
          </VitalField>
          <VitalField label="SpO2 %" error={form.formState.errors.spo2?.message}>
            <Input type="number" {...form.register("spo2")} />
          </VitalField>
          <VitalField label="Weight (kg)" error={form.formState.errors.weightKg?.message}>
            <Input type="number" step="0.1" {...form.register("weightKg")} />
          </VitalField>
          <VitalField label="Height (cm)" error={form.formState.errors.heightCm?.message}>
            <Input type="number" step="0.1" {...form.register("heightCm")} />
          </VitalField>
          <VitalField label="Pain 0–10" error={form.formState.errors.painScore?.message}>
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
          <p className="text-sm text-slate-600">BMI (approx.): {bmi}</p>
        ) : null}
        <div>
          <Label className="mb-1 block">Notes</Label>
          <Textarea rows={3} {...form.register("notes")} />
        </div>
        <Button type="submit" disabled={record.isPending}>
          {record.isPending ? "Saving…" : "Complete triage"}
        </Button>
        <p className="text-xs text-slate-500">
          Submitting sends the patient to the doctor queue (backend workflow).
        </p>
      </form>
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
