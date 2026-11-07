"use client";

import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, addDays, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { YesNoField } from "@/components/shared/yes-no-field";
import { LoadingBlock } from "@/components/shared/state-blocks";
import { cn } from "@/lib/utils";
import {
  ancVisitSchema,
  deliverySchema,
  laborAdmissionSchema,
  laborMonitoringSchema,
  obstetricHistorySchema,
  type AncVisitFormValues,
  type DeliveryFormValues,
  type LaborAdmissionFormValues,
  type LaborMonitoringFormValues,
  type ObstetricHistoryFormValues,
} from "@/features/maternal/schemas";
import {
  useAddLaborMonitoring,
  useAncVisits,
  useCreateAncVisit,
  useDelivery,
  useLabor,
  usePatientMaternal,
  useUpsertDelivery,
  useUpsertLabor,
  useUpsertObstetricHistory,
} from "@/features/maternal/hooks";
import type { AncVisit, ObstetricHistory } from "@/features/maternal/types";

type MaternalTab = "ob" | "anc" | "labor" | "delivery";

const selectClass =
  "flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30 disabled:cursor-not-allowed disabled:opacity-50";

function str(v: unknown) {
  return v == null ? "" : String(v);
}

function dateInput(v?: string | null) {
  if (!v) return "";
  try {
    return format(parseISO(v), "yyyy-MM-dd");
  } catch {
    return v.slice(0, 10);
  }
}

function dateTimeLocal(v?: string | null) {
  if (!v) return "";
  try {
    return format(new Date(v), "yyyy-MM-dd'T'HH:mm");
  } catch {
    return "";
  }
}

function computeEddFromLmp(lmp?: string) {
  if (!lmp?.trim()) return null;
  try {
    return format(addDays(parseISO(lmp.slice(0, 10)), 280), "yyyy-MM-dd");
  } catch {
    return null;
  }
}

function yesNoLabel(v?: boolean | null) {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "—";
}

export function DoctorMaternalHealthPanel({
  patientId,
  encounterId,
  readOnly,
}: {
  patientId: string;
  encounterId: string;
  readOnly?: boolean;
}) {
  const [tab, setTab] = useState<MaternalTab>("ob");

  return (
    <div className="space-y-3">
      <nav
        className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1"
        aria-label="Maternal health sections"
      >
        {(
          [
            ["ob", "OB History"],
            ["anc", "ANC Follow-up"],
            ["labor", "Labor"],
            ["delivery", "Delivery"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium",
              tab === id
                ? "bg-teal-800 text-white"
                : "bg-muted-bg text-foreground",
            )}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "ob" ? (
        <ObHistorySection patientId={patientId} readOnly={readOnly} />
      ) : null}
      {tab === "anc" ? (
        <AncSection
          patientId={patientId}
          encounterId={encounterId}
          readOnly={readOnly}
        />
      ) : null}
      {tab === "labor" ? (
        <LaborSection encounterId={encounterId} readOnly={readOnly} />
      ) : null}
      {tab === "delivery" ? (
        <DeliverySection encounterId={encounterId} readOnly={readOnly} />
      ) : null}
    </div>
  );
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

function ObHistorySection({
  patientId,
  readOnly,
}: {
  patientId: string;
  readOnly?: boolean;
}) {
  const maternal = usePatientMaternal(patientId);
  const save = useUpsertObstetricHistory(patientId);
  const form = useForm<ObstetricHistoryFormValues>({
    resolver: zodResolver(obstetricHistorySchema),
    defaultValues: {},
  });

  useEffect(() => {
    const oh = maternal.data?.obstetricHistory as ObstetricHistory | null | undefined;
    if (!oh) return;
    form.reset({
      gravidity: str(oh.gravidity),
      term: str(oh.term),
      preterm: str(oh.preterm),
      abortion: str(oh.abortion),
      living: str(oh.living),
      lmp: dateInput(oh.lmp),
      edd: dateInput(oh.edd),
      previousDelivery: oh.previousDelivery ?? undefined,
      previousCs: oh.previousCs ?? null,
      previousPph: oh.previousPph ?? null,
      previousPetEclampsia: oh.previousPetEclampsia ?? null,
      stillbirth: oh.stillbirth ?? null,
      otherComplications: oh.otherComplications ?? "",
      bloodGroupRh: oh.bloodGroupRh ?? "",
      hivStatus: oh.hivStatus ?? "",
      syphilisStatus: oh.syphilisStatus ?? "",
      hepatitisBStatus: oh.hepatitisBStatus ?? "",
      tetanusStatus: oh.tetanusStatus ?? "",
    });
  }, [maternal.data, form]);

  const lmp = form.watch("lmp");
  const serverEdd = maternal.data?.obstetricHistory?.edd;
  const computedEdd = useMemo(() => {
    if (serverEdd) return dateInput(serverEdd);
    return computeEddFromLmp(lmp);
  }, [lmp, serverEdd]);

  if (maternal.isLoading) return <LoadingBlock label="Loading obstetric history" />;

  return (
    <form
      className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm"
      onSubmit={form.handleSubmit((values) => {
        const payload = {
          ...values,
          edd: values.edd || computedEdd || undefined,
        };
        save.mutate(payload);
      })}
    >
      <h2 className="text-sm font-semibold text-foreground">Obstetric history</h2>
      <div className="grid gap-3 sm:grid-cols-5">
        <Field label="G (gravidity)">
          <Input type="number" disabled={readOnly} {...form.register("gravidity")} />
        </Field>
        <Field label="T (term)">
          <Input type="number" disabled={readOnly} {...form.register("term")} />
        </Field>
        <Field label="P (preterm)">
          <Input type="number" disabled={readOnly} {...form.register("preterm")} />
        </Field>
        <Field label="A (abortion)">
          <Input type="number" disabled={readOnly} {...form.register("abortion")} />
        </Field>
        <Field label="L (living)">
          <Input type="number" disabled={readOnly} {...form.register("living")} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="LMP">
          <Input type="date" disabled={readOnly} {...form.register("lmp")} />
        </Field>
        <Field label="EDD">
          <Input
            type="date"
            disabled={readOnly}
            {...form.register("edd")}
            placeholder={computedEdd ?? undefined}
          />
          {computedEdd && !form.watch("edd") ? (
            <p className="mt-1 text-2xs text-muted">Computed: {computedEdd}</p>
          ) : null}
        </Field>
        <Field label="Previous delivery">
          <select
            className={selectClass}
            disabled={readOnly}
            {...form.register("previousDelivery")}
          >
            <option value="">—</option>
            <option value="SVD">SVD</option>
            <option value="CS">CS</option>
            <option value="INSTRUMENTAL">Instrumental</option>
          </select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <YesNoField
          label="Previous CS"
          value={form.watch("previousCs")}
          onChange={(v) => form.setValue("previousCs", v)}
          disabled={readOnly}
        />
        <YesNoField
          label="Previous PPH"
          value={form.watch("previousPph")}
          onChange={(v) => form.setValue("previousPph", v)}
          disabled={readOnly}
        />
        <YesNoField
          label="Previous PET / eclampsia"
          value={form.watch("previousPetEclampsia")}
          onChange={(v) => form.setValue("previousPetEclampsia", v)}
          disabled={readOnly}
        />
        <YesNoField
          label="Stillbirth"
          value={form.watch("stillbirth")}
          onChange={(v) => form.setValue("stillbirth", v)}
          disabled={readOnly}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Blood group / Rh">
          <Input disabled={readOnly} {...form.register("bloodGroupRh")} />
        </Field>
        <Field label="HIV status">
          <Input disabled={readOnly} {...form.register("hivStatus")} />
        </Field>
        <Field label="Syphilis status">
          <Input disabled={readOnly} {...form.register("syphilisStatus")} />
        </Field>
        <Field label="Hepatitis B status">
          <Input disabled={readOnly} {...form.register("hepatitisBStatus")} />
        </Field>
        <Field label="Tetanus status">
          <Input disabled={readOnly} {...form.register("tetanusStatus")} />
        </Field>
        <Field label="Other complications">
          <Input disabled={readOnly} {...form.register("otherComplications")} />
        </Field>
      </div>
      {!readOnly ? (
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save obstetric history"}
        </Button>
      ) : null}
    </form>
  );
}

function AncSection({
  patientId,
  encounterId,
  readOnly,
}: {
  patientId: string;
  encounterId: string;
  readOnly?: boolean;
}) {
  const visits = useAncVisits(patientId);
  const create = useCreateAncVisit(patientId);
  const list = visits.data ?? [];
  const nextNumber = list.length + 1;

  const form = useForm<AncVisitFormValues>({
    resolver: zodResolver(ancVisitSchema),
    defaultValues: {
      visitNumber: String(nextNumber),
      visitDate: format(new Date(), "yyyy-MM-dd"),
      encounterId,
    },
  });

  useEffect(() => {
    form.setValue("visitNumber", String(nextNumber));
  }, [nextNumber, form]);

  if (visits.isLoading) return <LoadingBlock label="Loading ANC visits" />;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-border bg-muted-bg text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">GA</th>
              <th className="px-3 py-2 font-medium">BP</th>
              <th className="px-3 py-2 font-medium">Wt</th>
              <th className="px-3 py-2 font-medium">FHR</th>
              <th className="px-3 py-2 font-medium">Risk</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-muted">
                  No ANC visits yet.
                </td>
              </tr>
            ) : (
              list.map((v: AncVisit) => (
                <tr key={v.id} className="border-t border-border">
                  <td className="px-3 py-2">{v.visitNumber}</td>
                  <td className="px-3 py-2">{dateInput(v.visitDate)}</td>
                  <td className="px-3 py-2">
                    {v.gaWeeks != null
                      ? `${v.gaWeeks}w${v.gaDays != null ? `+${v.gaDays}d` : ""}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {v.systolic != null
                      ? `${v.systolic}/${v.diastolic ?? "—"}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2">{v.weightKg ?? "—"}</td>
                  <td className="px-3 py-2">{v.fetalHeartRate ?? "—"}</td>
                  <td className="px-3 py-2">{v.riskAssessment ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
                    visitNumber: String(nextNumber + 1),
                    visitDate: format(new Date(), "yyyy-MM-dd"),
                    encounterId,
                  }),
              },
            ),
          )}
        >
          <h2 className="text-sm font-semibold text-foreground">Add ANC visit</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Visit number">
              <Input type="number" {...form.register("visitNumber")} />
            </Field>
            <Field label="Visit date">
              <Input type="date" {...form.register("visitDate")} />
            </Field>
            <Field label="Risk">
              <select className={selectClass} {...form.register("riskAssessment")}>
                <option value="">—</option>
                <option value="LOW">Low</option>
                <option value="HIGH">High</option>
              </select>
            </Field>
            <Field label="GA weeks">
              <Input type="number" {...form.register("gaWeeks")} />
            </Field>
            <Field label="GA days">
              <Input type="number" {...form.register("gaDays")} />
            </Field>
            <Field label="Weight (kg)">
              <Input type="number" step="0.1" {...form.register("weightKg")} />
            </Field>
            <Field label="Systolic">
              <Input type="number" {...form.register("systolic")} />
            </Field>
            <Field label="Diastolic">
              <Input type="number" {...form.register("diastolic")} />
            </Field>
            <Field label="Pulse">
              <Input type="number" {...form.register("pulseRate")} />
            </Field>
            <Field label="Fundal height (cm)">
              <Input type="number" step="0.1" {...form.register("fundalHeightCm")} />
            </Field>
            <Field label="FHR">
              <Input type="number" {...form.register("fetalHeartRate")} />
            </Field>
            <Field label="Presentation">
              <select
                className={selectClass}
                {...form.register("fetalPresentation")}
              >
                <option value="">—</option>
                <option value="CEPHALIC">Cephalic</option>
                <option value="BREECH">Breech</option>
                <option value="TRANSVERSE">Transverse</option>
              </select>
            </Field>
            <Field label="Fetal movement">
              <select className={selectClass} {...form.register("fetalMovement")}>
                <option value="">—</option>
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
              </select>
            </Field>
            <Field label="Hb (g/dL)">
              <Input type="number" step="0.1" {...form.register("hemoglobinGdl")} />
            </Field>
            <Field label="Blood glucose">
              <Input type="number" step="0.1" {...form.register("bloodGlucose")} />
            </Field>
            <Field label="Next appointment">
              <Input type="date" {...form.register("nextAppointment")} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <YesNoField
              label="Urine protein"
              value={form.watch("urineProtein")}
              onChange={(v) => form.setValue("urineProtein", v)}
            />
            <YesNoField
              label="Urine glucose"
              value={form.watch("urineGlucose")}
              onChange={(v) => form.setValue("urineGlucose", v)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Treatment">
              <Textarea rows={2} {...form.register("treatment")} />
            </Field>
            <Field label="Ultrasound findings">
              <Textarea rows={2} {...form.register("ultrasoundFindings")} />
            </Field>
          </div>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Saving…" : "Add ANC visit"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

function LaborSection({
  encounterId,
  readOnly,
}: {
  encounterId: string;
  readOnly?: boolean;
}) {
  const labor = useLabor(encounterId);
  const save = useUpsertLabor(encounterId);
  const addMonitoring = useAddLaborMonitoring(encounterId);

  const admissionForm = useForm<LaborAdmissionFormValues>({
    resolver: zodResolver(laborAdmissionSchema),
    defaultValues: {
      admittedAt: dateTimeLocal(new Date().toISOString()),
    },
  });

  const monitorForm = useForm<LaborMonitoringFormValues>({
    resolver: zodResolver(laborMonitoringSchema),
    defaultValues: {
      recordedAt: dateTimeLocal(new Date().toISOString()),
    },
  });

  useEffect(() => {
    const data = labor.data;
    if (!data) return;
    admissionForm.reset({
      admittedAt: dateTimeLocal(data.admittedAt),
      gaWeeks: str(data.gaWeeks),
      onsetOfLabor: data.onsetOfLabor ?? undefined,
      cervicalDilatationCm: str(data.cervicalDilatationCm),
      cervicalEffacementPct: str(data.cervicalEffacementPct),
      membraneStatus: data.membraneStatus ?? undefined,
      liquor: data.liquor ?? undefined,
      fetalPresentation: data.fetalPresentation ?? undefined,
      fetalHeartRate: str(data.fetalHeartRate),
      contractionsNote: data.contractionsNote ?? "",
      systolic: str(data.systolic),
      diastolic: str(data.diastolic),
      pulseRate: str(data.pulseRate),
      temperatureC: str(data.temperatureC),
    });
  }, [labor.data, admissionForm]);

  if (labor.isLoading) return <LoadingBlock label="Loading labor record" />;

  const entries = labor.data?.monitoringEntries ?? [];

  return (
    <div className="space-y-4">
      <form
        className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm"
        onSubmit={admissionForm.handleSubmit((values) => save.mutate(values))}
      >
        <h2 className="text-sm font-semibold text-foreground">Labor admission</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Admitted at">
            <Input
              type="datetime-local"
              disabled={readOnly}
              {...admissionForm.register("admittedAt")}
            />
          </Field>
          <Field label="GA weeks">
            <Input
              type="number"
              disabled={readOnly}
              {...admissionForm.register("gaWeeks")}
            />
          </Field>
          <Field label="Onset">
            <select
              className={selectClass}
              disabled={readOnly}
              {...admissionForm.register("onsetOfLabor")}
            >
              <option value="">—</option>
              <option value="SPONTANEOUS">Spontaneous</option>
              <option value="INDUCED">Induced</option>
            </select>
          </Field>
          <Field label="Dilatation (cm)">
            <Input
              type="number"
              step="0.1"
              disabled={readOnly}
              {...admissionForm.register("cervicalDilatationCm")}
            />
          </Field>
          <Field label="Effacement %">
            <Input
              type="number"
              disabled={readOnly}
              {...admissionForm.register("cervicalEffacementPct")}
            />
          </Field>
          <Field label="Membranes">
            <select
              className={selectClass}
              disabled={readOnly}
              {...admissionForm.register("membraneStatus")}
            >
              <option value="">—</option>
              <option value="INTACT">Intact</option>
              <option value="RUPTURED">Ruptured</option>
            </select>
          </Field>
          <Field label="Liquor">
            <select
              className={selectClass}
              disabled={readOnly}
              {...admissionForm.register("liquor")}
            >
              <option value="">—</option>
              <option value="CLEAR">Clear</option>
              <option value="MECONIUM">Meconium</option>
              <option value="BLOOD_STAINED">Blood-stained</option>
            </select>
          </Field>
          <Field label="Presentation">
            <select
              className={selectClass}
              disabled={readOnly}
              {...admissionForm.register("fetalPresentation")}
            >
              <option value="">—</option>
              <option value="CEPHALIC">Cephalic</option>
              <option value="BREECH">Breech</option>
              <option value="TRANSVERSE">Transverse</option>
            </select>
          </Field>
          <Field label="FHR">
            <Input
              type="number"
              disabled={readOnly}
              {...admissionForm.register("fetalHeartRate")}
            />
          </Field>
          <Field label="Systolic">
            <Input
              type="number"
              disabled={readOnly}
              {...admissionForm.register("systolic")}
            />
          </Field>
          <Field label="Diastolic">
            <Input
              type="number"
              disabled={readOnly}
              {...admissionForm.register("diastolic")}
            />
          </Field>
          <Field label="Pulse">
            <Input
              type="number"
              disabled={readOnly}
              {...admissionForm.register("pulseRate")}
            />
          </Field>
          <Field label="Temp (°C)">
            <Input
              type="number"
              step="0.1"
              disabled={readOnly}
              {...admissionForm.register("temperatureC")}
            />
          </Field>
        </div>
        <Field label="Contractions note">
          <Textarea
            rows={2}
            disabled={readOnly}
            {...admissionForm.register("contractionsNote")}
          />
        </Field>
        {!readOnly ? (
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save labor admission"}
          </Button>
        ) : null}
      </form>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="min-w-full text-left text-xs">
          <thead className="border-b border-border bg-muted-bg text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Time</th>
              <th className="px-3 py-2 font-medium">Dilatation</th>
              <th className="px-3 py-2 font-medium">FHR</th>
              <th className="px-3 py-2 font-medium">Contr./10</th>
              <th className="px-3 py-2 font-medium">BP</th>
              <th className="px-3 py-2 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-muted">
                  No monitoring entries yet.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    {dateTimeLocal(e.recordedAt).replace("T", " ")}
                  </td>
                  <td className="px-3 py-2">{e.cervicalDilatationCm ?? "—"}</td>
                  <td className="px-3 py-2">{e.fetalHeartRate ?? "—"}</td>
                  <td className="px-3 py-2">{e.contractionsPer10Min ?? "—"}</td>
                  <td className="px-3 py-2">
                    {e.systolic != null
                      ? `${e.systolic}/${e.diastolic ?? "—"}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {e.medicationNote || e.membraneLiquorNote || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!readOnly ? (
        <form
          className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm"
          onSubmit={monitorForm.handleSubmit((values) =>
            addMonitoring.mutate(values, {
              onSuccess: () =>
                monitorForm.reset({
                  recordedAt: dateTimeLocal(new Date().toISOString()),
                }),
            }),
          )}
        >
          <h2 className="text-sm font-semibold text-foreground">
            Add monitoring entry
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Time">
              <Input type="datetime-local" {...monitorForm.register("recordedAt")} />
            </Field>
            <Field label="Dilatation (cm)">
              <Input
                type="number"
                step="0.1"
                {...monitorForm.register("cervicalDilatationCm")}
              />
            </Field>
            <Field label="FHR">
              <Input type="number" {...monitorForm.register("fetalHeartRate")} />
            </Field>
            <Field label="Contractions / 10 min">
              <Input
                type="number"
                {...monitorForm.register("contractionsPer10Min")}
              />
            </Field>
            <Field label="Duration (sec)">
              <Input
                type="number"
                {...monitorForm.register("contractionDurationSec")}
              />
            </Field>
            <Field label="Descent (fifths)">
              <Input type="number" {...monitorForm.register("descentFifths")} />
            </Field>
            <Field label="Systolic">
              <Input type="number" {...monitorForm.register("systolic")} />
            </Field>
            <Field label="Diastolic">
              <Input type="number" {...monitorForm.register("diastolic")} />
            </Field>
            <Field label="Pulse">
              <Input type="number" {...monitorForm.register("pulseRate")} />
            </Field>
            <Field label="Urine output (ml)">
              <Input type="number" {...monitorForm.register("urineOutputMl")} />
            </Field>
            <Field label="Membrane / liquor note">
              <Input {...monitorForm.register("membraneLiquorNote")} />
            </Field>
            <Field label="Medication note">
              <Input {...monitorForm.register("medicationNote")} />
            </Field>
          </div>
          <Button type="submit" disabled={addMonitoring.isPending}>
            {addMonitoring.isPending ? "Saving…" : "Add entry"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

function emptyNewborn() {
  return {
    birthOrder: "1",
    sex: undefined,
    birthWeightGrams: "",
    apgar1: "",
    apgar5: "",
    gaWeeks: "",
    status: undefined,
    resuscitation: null as boolean | null,
    nicuAdmission: null as boolean | null,
  };
}

function DeliverySection({
  encounterId,
  readOnly,
}: {
  encounterId: string;
  readOnly?: boolean;
}) {
  const delivery = useDelivery(encounterId);
  const save = useUpsertDelivery(encounterId);
  const form = useForm<DeliveryFormValues>({
    resolver: zodResolver(deliverySchema),
    defaultValues: {
      newborns: [emptyNewborn()],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "newborns",
  });

  useEffect(() => {
    const d = delivery.data;
    if (!d) return;
    form.reset({
      deliveredAt: dateTimeLocal(d.deliveredAt),
      modeOfDelivery: d.modeOfDelivery ?? undefined,
      csIndication: d.csIndication ?? "",
      placeOfDelivery: d.placeOfDelivery ?? undefined,
      presentation: d.presentation ?? undefined,
      episiotomy: d.episiotomy ?? null,
      perinealTearDegree: d.perinealTearDegree ?? "",
      placenta: d.placenta ?? undefined,
      thirdStageManagement: d.thirdStageManagement ?? undefined,
      estimatedBloodLossMl: str(d.estimatedBloodLossMl),
      complications: d.complications ?? "",
      maternalCondition: d.maternalCondition ?? undefined,
      pph: d.pph ?? null,
      bloodTransfusion: d.bloodTransfusion ?? null,
      additionalIntervention: d.additionalIntervention ?? "",
      postDeliverySystolic: str(d.postDeliverySystolic),
      postDeliveryDiastolic: str(d.postDeliveryDiastolic),
      disposition: d.disposition ?? undefined,
      newborns:
        d.newborns && d.newborns.length > 0
          ? d.newborns.map((n, i) => ({
              birthOrder: str(n.birthOrder ?? i + 1),
              sex: n.sex ?? undefined,
              birthWeightGrams: str(n.birthWeightGrams),
              apgar1: str(n.apgar1),
              apgar5: str(n.apgar5),
              gaWeeks: str(n.gaWeeks),
              status: n.status ?? undefined,
              resuscitation: n.resuscitation ?? null,
              nicuAdmission: n.nicuAdmission ?? null,
            }))
          : [emptyNewborn()],
    });
  }, [delivery.data, form]);

  if (delivery.isLoading) return <LoadingBlock label="Loading delivery" />;

  return (
    <form
      className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm"
      onSubmit={form.handleSubmit((values) => save.mutate(values))}
    >
      <h2 className="text-sm font-semibold text-foreground">Delivery</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Delivered at">
          <Input
            type="datetime-local"
            disabled={readOnly}
            {...form.register("deliveredAt")}
          />
        </Field>
        <Field label="Mode">
          <select
            className={selectClass}
            disabled={readOnly}
            {...form.register("modeOfDelivery")}
          >
            <option value="">—</option>
            <option value="SVD">SVD</option>
            <option value="CS">CS</option>
            <option value="ASSISTED_VAGINAL">Assisted vaginal</option>
          </select>
        </Field>
        <Field label="Place">
          <select
            className={selectClass}
            disabled={readOnly}
            {...form.register("placeOfDelivery")}
          >
            <option value="">—</option>
            <option value="CLINIC">Clinic</option>
            <option value="REFERRAL">Referral</option>
          </select>
        </Field>
        <Field label="Presentation">
          <select
            className={selectClass}
            disabled={readOnly}
            {...form.register("presentation")}
          >
            <option value="">—</option>
            <option value="CEPHALIC">Cephalic</option>
            <option value="BREECH">Breech</option>
            <option value="TRANSVERSE">Transverse</option>
          </select>
        </Field>
        <Field label="CS indication">
          <Input disabled={readOnly} {...form.register("csIndication")} />
        </Field>
        <Field label="Perineal tear">
          <Input disabled={readOnly} {...form.register("perinealTearDegree")} />
        </Field>
        <Field label="Placenta">
          <select
            className={selectClass}
            disabled={readOnly}
            {...form.register("placenta")}
          >
            <option value="">—</option>
            <option value="COMPLETE">Complete</option>
            <option value="INCOMPLETE">Incomplete</option>
          </select>
        </Field>
        <Field label="3rd stage">
          <select
            className={selectClass}
            disabled={readOnly}
            {...form.register("thirdStageManagement")}
          >
            <option value="">—</option>
            <option value="ACTIVE">Active</option>
            <option value="PHYSIOLOGICAL">Physiological</option>
          </select>
        </Field>
        <Field label="EBL (ml)">
          <Input
            type="number"
            disabled={readOnly}
            {...form.register("estimatedBloodLossMl")}
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <YesNoField
          label="Episiotomy"
          value={form.watch("episiotomy")}
          onChange={(v) => form.setValue("episiotomy", v)}
          disabled={readOnly}
        />
        <YesNoField
          label="PPH"
          value={form.watch("pph")}
          onChange={(v) => form.setValue("pph", v)}
          disabled={readOnly}
        />
        <YesNoField
          label="Blood transfusion"
          value={form.watch("bloodTransfusion")}
          onChange={(v) => form.setValue("bloodTransfusion", v)}
          disabled={readOnly}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Maternal condition">
          <select
            className={selectClass}
            disabled={readOnly}
            {...form.register("maternalCondition")}
          >
            <option value="">—</option>
            <option value="STABLE">Stable</option>
            <option value="UNSTABLE">Unstable</option>
          </select>
        </Field>
        <Field label="Post BP systolic">
          <Input
            type="number"
            disabled={readOnly}
            {...form.register("postDeliverySystolic")}
          />
        </Field>
        <Field label="Post BP diastolic">
          <Input
            type="number"
            disabled={readOnly}
            {...form.register("postDeliveryDiastolic")}
          />
        </Field>
        <Field label="Disposition">
          <select
            className={selectClass}
            disabled={readOnly}
            {...form.register("disposition")}
          >
            <option value="">—</option>
            <option value="POSTNATAL_WARD">Postnatal ward</option>
            <option value="REFERRAL">Referral</option>
            <option value="OTHER">Other</option>
          </select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Complications">
          <Textarea rows={2} disabled={readOnly} {...form.register("complications")} />
        </Field>
        <Field label="Additional intervention">
          <Textarea
            rows={2}
            disabled={readOnly}
            {...form.register("additionalIntervention")}
          />
        </Field>
      </div>

      <div className="space-y-3 border-t border-border pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Newborns</h3>
          {!readOnly ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                append({
                  ...emptyNewborn(),
                  birthOrder: String(fields.length + 1),
                })
              }
            >
              Add newborn
            </Button>
          ) : null}
        </div>
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="space-y-3 rounded-md border border-border bg-muted-bg/40 p-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted">
                Baby {index + 1}
              </p>
              {!readOnly && fields.length > 1 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(index)}
                >
                  Remove
                </Button>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Sex">
                <select
                  className={selectClass}
                  disabled={readOnly}
                  {...form.register(`newborns.${index}.sex`)}
                >
                  <option value="">—</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </Field>
              <Field label="Weight (g)">
                <Input
                  type="number"
                  disabled={readOnly}
                  {...form.register(`newborns.${index}.birthWeightGrams`)}
                />
              </Field>
              <Field label="Status">
                <select
                  className={selectClass}
                  disabled={readOnly}
                  {...form.register(`newborns.${index}.status`)}
                >
                  <option value="">—</option>
                  <option value="ALIVE">Alive</option>
                  <option value="STILLBIRTH">Stillbirth</option>
                </select>
              </Field>
              <Field label="Apgar 1">
                <Input
                  type="number"
                  disabled={readOnly}
                  {...form.register(`newborns.${index}.apgar1`)}
                />
              </Field>
              <Field label="Apgar 5">
                <Input
                  type="number"
                  disabled={readOnly}
                  {...form.register(`newborns.${index}.apgar5`)}
                />
              </Field>
              <Field label="GA weeks">
                <Input
                  type="number"
                  disabled={readOnly}
                  {...form.register(`newborns.${index}.gaWeeks`)}
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <YesNoField
                label="Resuscitation"
                value={form.watch(`newborns.${index}.resuscitation`)}
                onChange={(v) =>
                  form.setValue(`newborns.${index}.resuscitation`, v)
                }
                disabled={readOnly}
              />
              <YesNoField
                label="NICU admission"
                value={form.watch(`newborns.${index}.nicuAdmission`)}
                onChange={(v) =>
                  form.setValue(`newborns.${index}.nicuAdmission`, v)
                }
                disabled={readOnly}
              />
            </div>
          </div>
        ))}
      </div>

      {!readOnly ? (
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save delivery"}
        </Button>
      ) : null}

      {readOnly && delivery.data ? (
        <p className="text-xs text-muted">
          Episiotomy {yesNoLabel(delivery.data.episiotomy)} · PPH{" "}
          {yesNoLabel(delivery.data.pph)} · Transfusion{" "}
          {yesNoLabel(delivery.data.bloodTransfusion)}
        </p>
      ) : null}
    </form>
  );
}
