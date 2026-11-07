"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { YesNoField } from "@/components/shared/yes-no-field";
import { LoadingBlock } from "@/components/shared/state-blocks";
import {
  CONTRACEPTIVE_METHODS,
  familyPlanningSchema,
  type FamilyPlanningFormValues,
} from "@/features/family-planning/schemas";
import {
  useCreateFamilyPlanning,
  useFamilyPlanning,
} from "@/features/family-planning/hooks";
import type { FamilyPlanningRecord } from "@/features/family-planning/types";

const selectClass =
  "flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30 disabled:cursor-not-allowed disabled:opacity-50";

function methodLabel(value?: string | null) {
  if (!value) return "—";
  return value.replaceAll("_", " ");
}

function dateInput(v?: string | null) {
  if (!v) return "";
  try {
    return format(parseISO(v), "yyyy-MM-dd");
  } catch {
    return v.slice(0, 10);
  }
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1 block text-xs">{label}</Label>
      {children}
    </div>
  );
}

export function DoctorFamilyPlanningPanel({
  patientId,
  encounterId,
  readOnly,
}: {
  patientId: string;
  encounterId: string;
  readOnly?: boolean;
}) {
  const records = useFamilyPlanning(patientId);
  const create = useCreateFamilyPlanning(patientId);
  const form = useForm<FamilyPlanningFormValues>({
    resolver: zodResolver(familyPlanningSchema),
    defaultValues: { encounterId },
  });

  useEffect(() => {
    form.setValue("encounterId", encounterId);
  }, [encounterId, form]);

  if (records.isLoading) {
    return <LoadingBlock label="Loading family planning" />;
  }

  const list = records.data ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">
          Prior family planning records
        </h2>
        {list.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No prior FP records.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {list.map((r: FamilyPlanningRecord) => (
              <li
                key={r.id}
                className="rounded-md border border-border px-3 py-2 text-xs"
              >
                <p className="font-medium text-foreground">
                  {r.visitType?.replaceAll("_", " ") ?? "Visit"}
                  {r.currentMethod
                    ? ` · ${methodLabel(r.currentMethod)}`
                    : ""}
                </p>
                <p className="mt-0.5 text-muted">
                  {r.procedureDate
                    ? dateInput(r.procedureDate)
                    : r.createdAt
                      ? dateInput(r.createdAt)
                      : "—"}
                  {r.outcome ? ` · ${r.outcome}` : ""}
                  {r.systolic != null
                    ? ` · BP ${r.systolic}/${r.diastolic ?? "—"}`
                    : ""}
                </p>
                {r.counselingNotes ? (
                  <p className="mt-1 text-foreground">{r.counselingNotes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {!readOnly ? (
        <form
          className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm"
          onSubmit={form.handleSubmit((values) =>
            create.mutate(
              { ...values, encounterId },
              {
                onSuccess: () =>
                  form.reset({
                    encounterId,
                    visitType: undefined,
                    gravidity: "",
                    parity: "",
                    livingChildren: "",
                    previousMethod: undefined,
                    currentMethod: undefined,
                    pregnancyStatus: "",
                    systolic: "",
                    diastolic: "",
                    contraindications: "",
                    counselingDone: null,
                    counselingNotes: "",
                    procedureDate: "",
                    sideEffects: "",
                    nextAppointment: "",
                    outcome: undefined,
                  }),
              },
            ),
          )}
        >
          <h2 className="text-sm font-semibold text-foreground">
            New family planning record
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Visit type">
              <select className={selectClass} {...form.register("visitType")}>
                <option value="">—</option>
                <option value="NEW">New</option>
                <option value="RETURNING">Returning</option>
                <option value="SWITCHING">Switching</option>
                <option value="FOLLOW_UP">Follow-up</option>
              </select>
            </Field>
            <Field label="Gravidity">
              <Input type="number" {...form.register("gravidity")} />
            </Field>
            <Field label="Parity">
              <Input type="number" {...form.register("parity")} />
            </Field>
            <Field label="Living children">
              <Input type="number" {...form.register("livingChildren")} />
            </Field>
            <Field label="Previous method">
              <select
                className={selectClass}
                {...form.register("previousMethod")}
              >
                <option value="">—</option>
                {CONTRACEPTIVE_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {methodLabel(m)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Current method">
              <select
                className={selectClass}
                {...form.register("currentMethod")}
              >
                <option value="">—</option>
                {CONTRACEPTIVE_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {methodLabel(m)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Systolic">
              <Input type="number" {...form.register("systolic")} />
            </Field>
            <Field label="Diastolic">
              <Input type="number" {...form.register("diastolic")} />
            </Field>
            <Field label="Pregnancy status">
              <Input {...form.register("pregnancyStatus")} />
            </Field>
            <Field label="Procedure date">
              <Input type="date" {...form.register("procedureDate")} />
            </Field>
            <Field label="Next appointment">
              <Input type="date" {...form.register("nextAppointment")} />
            </Field>
            <Field label="Outcome">
              <select className={selectClass} {...form.register("outcome")}>
                <option value="">—</option>
                <option value="CONTINUE">Continue</option>
                <option value="DISCONTINUE">Discontinue</option>
                <option value="REMOVE">Remove</option>
                <option value="SWITCH">Switch</option>
              </select>
            </Field>
          </div>
          <YesNoField
            label="Counseling done"
            value={form.watch("counselingDone")}
            onChange={(v) => form.setValue("counselingDone", v)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Contraindications">
              <Textarea rows={2} {...form.register("contraindications")} />
            </Field>
            <Field label="Counseling notes">
              <Textarea rows={2} {...form.register("counselingNotes")} />
            </Field>
            <Field label="Side effects">
              <Textarea rows={2} {...form.register("sideEffects")} />
            </Field>
          </div>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Saving…" : "Save FP record"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
