"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormDraftBanner } from "@/components/shared/form-draft-banner";
import { PatientIdentityBar } from "@/components/shared/patient-identity-bar";
import { LoadingBlock, ErrorState } from "@/components/shared/state-blocks";
import { useFormDraft } from "@/lib/drafts/use-form-draft";
import { useEncounter } from "@/features/encounters/hooks";
import {
  consultationSchema,
  diagnosisSchema,
  type ConsultationFormValues,
  type DiagnosisFormValues,
} from "@/features/consultations/schemas";
import {
  useAddDiagnosis,
  useConsultation,
  useFinalizeConsultation,
  useSaveConsultation,
} from "@/features/consultations/hooks";
import {
  useRequestBilling,
  useRouteEncounter,
} from "@/features/encounters/hooks";
import { DoctorPatientChartPanel } from "@/components/doctor/doctor-patient-chart-panel";
import { PaymentBillingExplainer } from "@/components/shared/payment-billing-explainer";
import { cn } from "@/lib/utils";
import {
  DiagnosisType,
  EncounterPriority,
  QueueStation,
} from "@/types/encounter";
import {
  useLabOrders,
  useLabTests,
  useCreateLabOrder,
} from "@/features/laboratory/hooks";
import {
  useCreatePrescription,
  useMedicines,
  usePrescriptions,
} from "@/features/prescriptions/hooks";
import { toast } from "sonner";

type Step =
  | "consult"
  | "diagnosis"
  | "lab"
  | "rx"
  | "send"
  | "payment"
  | "followup";

export function DoctorConsultationWorkspace({
  encounterId,
}: {
  encounterId: string;
}) {
  const encounter = useEncounter(encounterId);
  const consultationQuery = useConsultation(encounterId);
  const save = useSaveConsultation(encounterId);
  const [workflowStep, setWorkflowStep] = useState<Step>("consult");
  const [ensuringDraft, setEnsuringDraft] = useState(false);
  const requestBilling = useRequestBilling(encounterId);
  const routePatient = useRouteEncounter(encounterId);

  const consultation = consultationQuery.data;
  const consultationId = consultation?.id;

  const form = useForm<ConsultationFormValues>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      chiefComplaint: "",
      historyPresentIllness: "",
      physicalExam: "",
      assessment: "",
      plan: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (consultation) {
      form.reset({
        chiefComplaint: consultation.chiefComplaint ?? "",
        historyPresentIllness: consultation.historyPresentIllness ?? "",
        physicalExam: consultation.physicalExam ?? "",
        assessment: consultation.assessment ?? "",
        plan: consultation.plan ?? "",
        notes: consultation.notes ?? "",
      });
    } else if (encounter.data?.reason) {
      form.setValue("chiefComplaint", encounter.data.reason);
    }
  }, [consultation, encounter.data?.reason, form]);

  const watchedValues = form.watch();
  const { pendingDraft, clearDraft, dismissDraft } = useFormDraft(
    `consultation:${encounterId}`,
    watchedValues,
    {
      enabled:
        consultationQuery.isSuccess && consultation?.status !== "FINALIZED",
    },
  );

  async function ensureConsultation(): Promise<string | null> {
    if (consultationId) return consultationId;
    setEnsuringDraft(true);
    try {
      const values = form.getValues();
      const saved = await save.mutateAsync(values);
      clearDraft();
      return saved.id;
    } catch {
      toast.error("Save the consult first, then try again");
      return null;
    } finally {
      setEnsuringDraft(false);
    }
  }

  async function goToStep(id: Step) {
    setWorkflowStep(id);
    if (
      (id === "lab" || id === "rx" || id === "diagnosis" || id === "send") &&
      !consultationId
    ) {
      await ensureConsultation();
    }
  }

  if (encounter.isLoading || consultationQuery.isLoading) {
    return <LoadingBlock label="Loading consultation workspace" />;
  }
  if (encounter.isError || !encounter.data?.patient) {
    return <ErrorState message="Encounter could not be loaded." />;
  }

  const patient = encounter.data.patient;
  const triage = encounter.data.triage as Record<string, unknown> | null;
  const isFinalized = consultation?.status === "FINALIZED";

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PatientIdentityBar
        patient={patient}
        encounterNumber={encounter.data.encounterNumber}
        encounterStatus={encounter.data.status}
      />

      {pendingDraft ? (
        <FormDraftBanner
          savedAt={pendingDraft.savedAt}
          onRestore={() => form.reset(pendingDraft.values)}
          onDiscard={dismissDraft}
        />
      ) : null}

      <nav
        className="flex flex-wrap gap-2 border-b border-slate-200 pb-2"
        aria-label="Consultation workflow"
      >
        {(
          [
            ["consult", "Consult"],
            ["diagnosis", "Diagnosis"],
            ["lab", "Lab"],
            ["rx", "Prescription"],
            ["send", "Send"],
            ["payment", "Pay"],
            ["followup", "Follow-up"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              workflowStep === id
                ? "bg-teal-800 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200",
            )}
            onClick={() => void goToStep(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {ensuringDraft ? (
        <p className="text-sm text-slate-600">Saving consult draft…</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-12">
        <aside className="space-y-3 lg:col-span-3">
          <Panel title="Triage summary">
            {triage ? (
              <ul className="space-y-1 text-xs text-slate-700">
                {triage.temperature != null ? (
                  <li>Temp: {String(triage.temperature)} °C</li>
                ) : null}
                {triage.systolic != null ? (
                  <li>
                    BP: {String(triage.systolic)}/{String(triage.diastolic)}
                  </li>
                ) : null}
                {triage.heartRate != null ? (
                  <li>Pulse: {String(triage.heartRate)}</li>
                ) : null}
                {triage.spo2 != null ? (
                  <li>SpO2: {String(triage.spo2)}%</li>
                ) : null}
                {triage.bloodGlucoseMgDl != null ? (
                  <li>Glucose: {String(triage.bloodGlucoseMgDl)} mg/dL</li>
                ) : null}
                {triage.notes ? <li>Notes: {String(triage.notes)}</li> : null}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">No triage recorded.</p>
            )}
          </Panel>
          {consultationId ? (
            <OrdersPanel consultationId={consultationId} />
          ) : (
            <p className="text-xs text-slate-500">Save draft to create orders.</p>
          )}
          <DoctorPatientChartPanel
            patientId={patient.id}
            encounterId={encounterId}
          />
        </aside>

        <section className="space-y-4 lg:col-span-6">
          {workflowStep === "consult" ? (
            <form
              className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              onSubmit={form.handleSubmit((values) =>
                save.mutate(values, { onSuccess: () => clearDraft() }),
              )}
            >
              <h2 className="text-sm font-semibold text-slate-800">
                Consultation
              </h2>
              <Field label="Chief complaint">
                <Textarea
                  rows={2}
                  disabled={isFinalized}
                  {...form.register("chiefComplaint")}
                />
              </Field>
              <Field label="History (HPI)">
                <Textarea
                  rows={3}
                  disabled={isFinalized}
                  {...form.register("historyPresentIllness")}
                />
              </Field>
              <Field label="Examination">
                <Textarea
                  rows={3}
                  disabled={isFinalized}
                  {...form.register("physicalExam")}
                />
              </Field>
              <Field label="Assessment">
                <Textarea
                  rows={2}
                  disabled={isFinalized}
                  {...form.register("assessment")}
                />
              </Field>
              <Field label="Plan">
                <Textarea
                  rows={2}
                  disabled={isFinalized}
                  {...form.register("plan")}
                />
              </Field>
              <Field label="Notes">
                <Textarea
                  rows={2}
                  disabled={isFinalized}
                  {...form.register("notes")}
                />
              </Field>
              {!isFinalized ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={save.isPending}>
                    {save.isPending ? "Saving…" : "Save draft"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void goToStep("lab")}
                  >
                    Lab
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void goToStep("rx")}
                  >
                    Prescription
                  </Button>
                </div>
              ) : null}
            </form>
          ) : null}

          {workflowStep === "diagnosis" ? (
            <DiagnosisTab
              consultationId={consultationId}
              encounterId={encounterId}
              diagnoses={consultation?.diagnoses ?? []}
              isFinalized={isFinalized}
              onNeedDraft={() => void ensureConsultation()}
            />
          ) : null}

          {workflowStep === "lab" ? (
            <LabTab
              consultationId={consultationId}
              isFinalized={isFinalized}
              onNeedDraft={() => void ensureConsultation()}
              onSentToLab={() =>
                routePatient.mutate(QueueStation.LAB)
              }
            />
          ) : null}

          {workflowStep === "rx" ? (
            <PrescriptionTab
              consultationId={consultationId}
              isFinalized={isFinalized}
              onNeedDraft={() => void ensureConsultation()}
              onSentToPharmacy={() =>
                routePatient.mutate(QueueStation.PHARMACY)
              }
            />
          ) : null}

          {workflowStep === "send" ? (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800">
                Send patient to
              </h2>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    [QueueStation.LAB, "Lab"],
                    [QueueStation.PHARMACY, "Pharmacy"],
                    [QueueStation.CASHIER, "Front desk / Pay"],
                    [QueueStation.TRIAGE, "Triage / Nurse"],
                    [QueueStation.DOCTOR, "Back to doctor queue"],
                  ] as const
                ).map(([station, label]) => (
                  <Button
                    key={station}
                    type="button"
                    variant={
                      station === QueueStation.CASHIER ? "default" : "outline"
                    }
                    disabled={routePatient.isPending}
                    onClick={() => {
                      if (station === QueueStation.LAB) {
                        void goToStep("lab");
                      } else if (station === QueueStation.PHARMACY) {
                        void goToStep("rx");
                      }
                      routePatient.mutate(station);
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          {workflowStep === "payment" ? (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800">Payment</h2>
              <PaymentBillingExplainer
                variant="doctor"
                encounterNumber={encounter.data.encounterNumber}
                invoiceNumber={encounter.data.invoice?.invoiceNumber}
                invoiceStatus={encounter.data.invoice?.status}
              />
              <Button
                type="button"
                disabled={requestBilling.isPending}
                onClick={() => requestBilling.mutate()}
              >
                {requestBilling.isPending
                  ? "Sending…"
                  : "Send to front desk to pay"}
              </Button>
            </div>
          ) : null}

          {workflowStep === "followup" ? (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800">Follow-up</h2>
              <Field label="Follow-up plan">
                <Textarea
                  rows={4}
                  disabled={isFinalized}
                  {...form.register("plan")}
                />
              </Field>
              {!isFinalized ? (
                <Button
                  type="button"
                  disabled={save.isPending}
                  onClick={() =>
                    save.mutate(form.getValues(), {
                      onSuccess: () => clearDraft(),
                    })
                  }
                >
                  {save.isPending ? "Saving…" : "Save follow-up"}
                </Button>
              ) : null}
            </div>
          ) : null}
        </section>

        <aside className="lg:col-span-3">
          {consultationId && !isFinalized ? (
            <FinalizeBlock
              consultationId={consultationId}
              encounterId={encounterId}
            />
          ) : null}
          {isFinalized ? (
            <p className="rounded-md bg-slate-100 p-3 text-sm text-slate-700">
              Consultation finalized. Status:{" "}
              {encounter.data.status.replaceAll("_", " ")}.
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
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

function DiagnosisTab({
  consultationId,
  encounterId,
  diagnoses,
  isFinalized,
  onNeedDraft,
}: {
  consultationId?: string;
  encounterId: string;
  diagnoses: Array<{
    id: string;
    label: string;
    type?: string;
    isPrimary?: boolean;
  }>;
  isFinalized: boolean;
  onNeedDraft: () => void;
}) {
  if (!consultationId) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-600">Save consult draft first.</p>
        <Button type="button" className="mt-2" onClick={onNeedDraft}>
          Save draft
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">Diagnosis</h2>
      {diagnoses.length > 0 ? (
        <ul className="space-y-1 text-sm text-slate-700">
          {diagnoses.map((d) => (
            <li key={d.id} className="flex items-center gap-2">
              <input type="checkbox" checked readOnly className="h-4 w-4" />
              <span>
                {d.isPrimary ? "★ " : ""}
                {d.label}
                {d.type ? ` (${d.type})` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">No diagnoses yet.</p>
      )}
      {!isFinalized ? (
        <DiagnosisSection
          consultationId={consultationId}
          encounterId={encounterId}
          diagnoses={diagnoses}
        />
      ) : null}
    </div>
  );
}

function DiagnosisSection({
  consultationId,
  encounterId,
  diagnoses,
}: {
  consultationId: string;
  encounterId: string;
  diagnoses: Array<{ id: string; label: string }>;
}) {
  const add = useAddDiagnosis(consultationId, encounterId);
  const form = useForm<DiagnosisFormValues>({
    resolver: zodResolver(diagnosisSchema),
    defaultValues: {
      label: "",
      type: DiagnosisType.PROVISIONAL,
      isPrimary: diagnoses.length === 0,
    },
  });

  return (
    <form
      className="mt-2 flex flex-wrap gap-2 border-t border-slate-100 pt-3"
      onSubmit={form.handleSubmit((values) => {
        add.mutate(values, {
          onSuccess: () =>
            form.reset({
              label: "",
              type: DiagnosisType.PROVISIONAL,
              isPrimary: false,
            }),
        });
      })}
    >
      <Input
        className="min-w-[200px] flex-1"
        placeholder="Diagnosis label"
        {...form.register("label")}
      />
      <select
        className="h-10 rounded-md border border-slate-200 px-2 text-sm"
        {...form.register("type")}
      >
        {Object.values(DiagnosisType).map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1 text-xs text-slate-600">
        <input type="checkbox" {...form.register("isPrimary")} />
        Primary
      </label>
      <Button type="submit" size="sm" disabled={add.isPending}>
        Add
      </Button>
    </form>
  );
}

function LabTab({
  consultationId,
  isFinalized,
  onNeedDraft,
  onSentToLab,
}: {
  consultationId?: string;
  isFinalized: boolean;
  onNeedDraft: () => void;
  onSentToLab: () => void;
}) {
  const tests = useLabTests();
  const labs = useLabOrders();
  const create = useCreateLabOrder(consultationId ?? "");
  const [selected, setSelected] = useState<string[]>([]);
  const [priority, setPriority] = useState<EncounterPriority>(
    EncounterPriority.ROUTINE,
  );
  const [notes, setNotes] = useState("");

  const myOrders =
    labs.data?.filter((o) => o.consultationId === consultationId) ?? [];

  if (!consultationId) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-600">Save consult draft first.</p>
        <Button type="button" className="mt-2" onClick={onNeedDraft}>
          Save draft
        </Button>
      </div>
    );
  }

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">Lab orders</h2>

      {!isFinalized ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-600">
            Select tests (checkboxes)
          </p>
          {tests.isLoading ? <LoadingBlock label="Loading tests" /> : null}
          {tests.isSuccess && (tests.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-amber-800">
              No lab tests in catalog. Ask admin to add tests.
            </p>
          ) : null}
          <ul className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-slate-100 p-2 text-sm">
            {tests.data?.map((t) => (
              <li key={t.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={selected.includes(t.id)}
                    onChange={() => toggle(t.id)}
                  />
                  <span className="flex-1">
                    {t.name}
                    <span className="ml-1 text-xs text-slate-500">{t.code}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Priority">
              <select
                className="h-10 w-full rounded-md border border-slate-200 px-2 text-sm"
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as EncounterPriority)
                }
              >
                {Object.values(EncounterPriority).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Clinical notes">
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
              />
            </Field>
          </div>
          <Button
            type="button"
            disabled={!selected.length || create.isPending}
            onClick={() =>
              create.mutate(
                {
                  labTestIds: selected,
                  priority,
                  clinicalNotes: notes || undefined,
                },
                {
                  onSuccess: () => {
                    setSelected([]);
                    setNotes("");
                    onSentToLab();
                  },
                },
              )
            }
          >
            {create.isPending
              ? "Sending…"
              : `Send lab order (${selected.length})`}
          </Button>
        </div>
      ) : null}

      <div className="border-t border-slate-100 pt-3">
        <p className="mb-2 text-xs font-medium text-slate-600">
          Lab reports / orders
        </p>
        {myOrders.length === 0 ? (
          <p className="text-sm text-slate-500">No lab orders yet.</p>
        ) : (
          <ul className="space-y-3">
            {myOrders.map((order) => (
              <li
                key={order.id}
                className="rounded-md border border-slate-100 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <input type="checkbox" checked readOnly className="h-4 w-4" />
                  <span className="font-medium">{order.orderNumber}</span>
                  <span className="text-xs text-slate-500">{order.status}</span>
                </div>
                <ul className="mt-2 space-y-1 pl-6 text-xs text-slate-700">
                  {order.items?.map((item) => (
                    <li key={item.id} className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-3.5 w-3.5"
                        checked={Boolean(item.result?.value)}
                        readOnly
                      />
                      <span>
                        {item.labTest?.name ?? "Test"}
                        {item.result?.value ? (
                          <span className="text-slate-900">
                            {" "}
                            — {item.result.value}
                            {item.result.unit ? ` ${item.result.unit}` : ""}
                            {item.result.flag
                              ? ` (${item.result.flag})`
                              : ""}
                          </span>
                        ) : (
                          <span className="text-slate-400"> — pending</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PrescriptionTab({
  consultationId,
  isFinalized,
  onNeedDraft,
  onSentToPharmacy,
}: {
  consultationId?: string;
  isFinalized: boolean;
  onNeedDraft: () => void;
  onSentToPharmacy: () => void;
}) {
  const medicines = useMedicines();
  const rxList = usePrescriptions();
  const create = useCreatePrescription(consultationId ?? "");
  const [selectedMeds, setSelectedMeds] = useState<string[]>([]);
  const [dose, setDose] = useState("1 tab");
  const [route, setRoute] = useState("PO");
  const [frequency, setFrequency] = useState("TID");
  const [duration, setDuration] = useState("5 days");
  const [quantity, setQuantity] = useState(15);

  const myRx =
    rxList.data?.filter((p) => p.consultationId === consultationId) ?? [];

  if (!consultationId) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-600">Save consult draft first.</p>
        <Button type="button" className="mt-2" onClick={onNeedDraft}>
          Save draft
        </Button>
      </div>
    );
  }

  function toggleMed(id: string) {
    setSelectedMeds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">Prescription</h2>

      {!isFinalized ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-600">
            Select medicines (checkboxes)
          </p>
          {medicines.isLoading ? (
            <LoadingBlock label="Loading medicines" />
          ) : null}
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-slate-100 p-2 text-sm">
            {medicines.data?.map((m) => (
              <li key={m.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={selectedMeds.includes(m.id)}
                    onChange={() => toggleMed(m.id)}
                  />
                  <span>
                    {m.name}
                    <span className="ml-1 text-xs text-slate-500">{m.code}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Dose"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
            />
            <Input
              placeholder="Route"
              value={route}
              onChange={(e) => setRoute(e.target.value)}
            />
            <Input
              placeholder="Frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            />
            <Input
              placeholder="Duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Qty"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
          <Button
            type="button"
            disabled={!selectedMeds.length || create.isPending}
            onClick={() =>
              create.mutate(
                {
                  items: selectedMeds.map((medicineId) => ({
                    medicineId,
                    dose,
                    route,
                    frequency,
                    duration,
                    quantity,
                  })),
                },
                {
                  onSuccess: () => {
                    setSelectedMeds([]);
                    onSentToPharmacy();
                  },
                },
              )
            }
          >
            {create.isPending
              ? "Sending…"
              : `Send to pharmacy (${selectedMeds.length})`}
          </Button>
        </div>
      ) : null}

      <div className="border-t border-slate-100 pt-3">
        <p className="mb-2 text-xs font-medium text-slate-600">
          Prescriptions sent
        </p>
        {myRx.length === 0 ? (
          <p className="text-sm text-slate-500">None yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {myRx.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <input type="checkbox" checked readOnly className="h-4 w-4" />
                {p.prescriptionNumber} — {p.status}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FinalizeBlock({
  consultationId,
  encounterId,
}: {
  consultationId: string;
  encounterId: string;
}) {
  const finalize = useFinalizeConsultation(consultationId, encounterId);
  return (
    <Panel title="Complete">
      <Button
        type="button"
        className="w-full"
        disabled={finalize.isPending}
        onClick={() => finalize.mutate()}
      >
        {finalize.isPending ? "Finalizing…" : "Complete consultation"}
      </Button>
    </Panel>
  );
}

function OrdersPanel({ consultationId }: { consultationId: string }) {
  const labs = useLabOrders();
  const rx = usePrescriptions();
  const labItems =
    labs.data?.filter((o) => o.consultationId === consultationId) ?? [];
  const rxItems =
    rx.data?.filter((p) => p.consultationId === consultationId) ?? [];

  return (
    <Panel title="Orders">
      <p className="text-xs font-medium text-slate-700">Laboratory</p>
      {labItems.length === 0 ? (
        <p className="text-xs text-slate-500">None</p>
      ) : (
        <ul className="mb-2 text-xs">
          {labItems.map((o) => (
            <li key={o.id}>
              {o.orderNumber} — {o.status}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs font-medium text-slate-700">Prescriptions</p>
      {rxItems.length === 0 ? (
        <p className="text-xs text-slate-500">None</p>
      ) : (
        <ul className="text-xs">
          {rxItems.map((p) => (
            <li key={p.id}>
              {p.prescriptionNumber} — {p.status}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
