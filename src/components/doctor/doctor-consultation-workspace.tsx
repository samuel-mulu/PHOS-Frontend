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
import { useRequestBilling } from "@/features/encounters/hooks";
import { DoctorPatientChartPanel } from "@/components/doctor/doctor-patient-chart-panel";
import { PaymentBillingExplainer } from "@/components/shared/payment-billing-explainer";
import { useTranslation } from "@/i18n/context";
import { cn } from "@/lib/utils";
import { DiagnosisType, EncounterPriority } from "@/types/encounter";
import { useLabOrders, useLabTests, useCreateLabOrder } from "@/features/laboratory/hooks";
import {
  useCreatePrescription,
  useMedicines,
  usePrescriptions,
} from "@/features/prescriptions/hooks";

export function DoctorConsultationWorkspace({
  encounterId,
}: {
  encounterId: string;
}) {
  const encounter = useEncounter(encounterId);
  const consultationQuery = useConsultation(encounterId);
  const save = useSaveConsultation(encounterId);
  const [labOpen, setLabOpen] = useState(false);
  const [rxOpen, setRxOpen] = useState(false);
  const [workflowStep, setWorkflowStep] = useState<
    "consult" | "diagnosis" | "lab" | "rx" | "payment" | "followup"
  >("consult");
  const requestBilling = useRequestBilling(encounterId);
  const { t } = useTranslation();

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
            ["payment", t("billing.termRequest")],
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
            onClick={() => {
              setWorkflowStep(id);
              if (id === "lab" && consultationId) setLabOpen(true);
              if (id === "rx" && consultationId) setRxOpen(true);
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {workflowStep === "payment" ? (
        <div className="space-y-3">
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
            {requestBilling.isPending ? "Sending…" : "Request payment"}
          </Button>
        </div>
      ) : null}

      {workflowStep === "followup" ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Record follow-up instructions in the <strong>Plan</strong> field under
          Consult, then save the consultation draft.
        </div>
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
                {triage.spo2 != null ? <li>SpO2: {String(triage.spo2)}%</li> : null}
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

        <section className="lg:col-span-6">
          <form
            className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            onSubmit={form.handleSubmit((values) =>
              save.mutate(values, { onSuccess: () => clearDraft() }),
            )}
          >
            <h2 className="text-sm font-semibold text-slate-800">Consultation</h2>
            <Field label="Chief complaint">
              <Textarea rows={2} disabled={isFinalized} {...form.register("chiefComplaint")} />
            </Field>
            <Field label="History (HPI)">
              <Textarea rows={3} disabled={isFinalized} {...form.register("historyPresentIllness")} />
            </Field>
            <Field label="Examination">
              <Textarea rows={3} disabled={isFinalized} {...form.register("physicalExam")} />
            </Field>
            <Field label="Assessment">
              <Textarea rows={2} disabled={isFinalized} {...form.register("assessment")} />
            </Field>
            <Field label="Plan">
              <Textarea rows={2} disabled={isFinalized} {...form.register("plan")} />
            </Field>
            <Field label="Notes">
              <Textarea rows={2} disabled={isFinalized} {...form.register("notes")} />
            </Field>
            {!isFinalized ? (
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending ? "Saving…" : "Save draft"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!consultationId}
                  onClick={() => setLabOpen(true)}
                >
                  Lab order
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!consultationId}
                  onClick={() => setRxOpen(true)}
                >
                  Prescription
                </Button>
              </div>
            ) : null}
          </form>
          {consultationId && !isFinalized ? (
            <DiagnosisSection
              consultationId={consultationId}
              encounterId={encounterId}
              diagnoses={consultation?.diagnoses ?? []}
            />
          ) : null}
          {consultationId && consultation?.diagnoses?.length ? (
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              {consultation.diagnoses.map((d) => (
                <li key={d.id}>
                  {d.isPrimary ? "★ " : ""}
                  {d.label} ({d.type})
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <aside className="lg:col-span-3">
          {consultationId && !isFinalized ? (
            <FinalizeBlock consultationId={consultationId} encounterId={encounterId} />
          ) : null}
          {isFinalized ? (
            <p className="rounded-md bg-slate-100 p-3 text-sm text-slate-700">
              Consultation finalized. Next steps follow encounter status (
              {encounter.data.status.replaceAll("_", " ")}).
            </p>
          ) : null}
        </aside>
      </div>

      {consultationId && labOpen ? (
        <LabOrderDrawer
          consultationId={consultationId}
          onClose={() => setLabOpen(false)}
        />
      ) : null}
      {consultationId && rxOpen ? (
        <PrescriptionDrawer
          consultationId={consultationId}
          onClose={() => setRxOpen(false)}
        />
      ) : null}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block text-xs">{label}</Label>
      {children}
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
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-slate-800">Add diagnosis</h3>
      <form
        className="mt-2 flex flex-wrap gap-2"
        onSubmit={form.handleSubmit((values) => {
          add.mutate(values, {
            onSuccess: () => form.reset({ label: "", type: DiagnosisType.PROVISIONAL }),
          });
        })}
      >
        <Input className="min-w-[200px] flex-1" placeholder="Label" {...form.register("label")} />
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
        <Button type="submit" size="sm" disabled={add.isPending}>
          Add
        </Button>
      </form>
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
      <p className="mb-3 text-xs text-slate-600">
        Finalize when documentation and orders are ready. Backend sets the next
        encounter state.
      </p>
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

function LabOrderDrawer({
  consultationId,
  onClose,
}: {
  consultationId: string;
  onClose: () => void;
}) {
  const tests = useLabTests();
  const create = useCreateLabOrder(consultationId);
  const [selected, setSelected] = useState<string[]>([]);
  const [priority, setPriority] = useState<EncounterPriority>(
    EncounterPriority.ROUTINE,
  );
  const [notes, setNotes] = useState("");

  return (
    <DrawerShell title="Laboratory order" onClose={onClose}>
      {tests.isLoading ? (
        <LoadingBlock label="Loading tests" />
      ) : (
        <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
          {tests.data?.map((t) => (
            <li key={t.id}>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.includes(t.id)}
                  onChange={(e) =>
                    setSelected((prev) =>
                      e.target.checked
                        ? [...prev, t.id]
                        : prev.filter((id) => id !== t.id),
                    )
                  }
                />
                {t.code} — {t.name}
              </label>
            </li>
          ))}
        </ul>
      )}
      <select
        className="mt-3 h-10 w-full rounded-md border px-2 text-sm"
        value={priority}
        onChange={(e) => setPriority(e.target.value as EncounterPriority)}
      >
        {Object.values(EncounterPriority).map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <Textarea
        className="mt-2"
        placeholder="Clinical notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <Button
        type="button"
        className="mt-3"
        disabled={!selected.length || create.isPending}
        onClick={() =>
          create.mutate(
            {
              labTestIds: selected,
              priority,
              clinicalNotes: notes || undefined,
            },
            { onSuccess: onClose },
          )
        }
      >
        Submit lab order
      </Button>
    </DrawerShell>
  );
}

function PrescriptionDrawer({
  consultationId,
  onClose,
}: {
  consultationId: string;
  onClose: () => void;
}) {
  const medicines = useMedicines();
  const create = useCreatePrescription(consultationId);
  const [medicineId, setMedicineId] = useState("");
  const [dose, setDose] = useState("1 tab");
  const [route, setRoute] = useState("PO");
  const [frequency, setFrequency] = useState("TID");
  const [duration, setDuration] = useState("5 days");
  const [quantity, setQuantity] = useState(15);

  return (
    <DrawerShell title="Prescription" onClose={onClose}>
      <select
        className="h-10 w-full rounded-md border px-2 text-sm"
        value={medicineId}
        onChange={(e) => setMedicineId(e.target.value)}
      >
        <option value="">Select medicine</option>
        {medicines.data?.map((m) => (
          <option key={m.id} value={m.id}>
            {m.code} — {m.name}
          </option>
        ))}
      </select>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Input placeholder="Dose" value={dose} onChange={(e) => setDose(e.target.value)} />
        <Input placeholder="Route" value={route} onChange={(e) => setRoute(e.target.value)} />
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
        className="mt-3"
        disabled={!medicineId || create.isPending}
        onClick={() =>
          create.mutate(
            {
              items: [
                {
                  medicineId,
                  dose,
                  route,
                  frequency,
                  duration,
                  quantity,
                },
              ],
            },
            { onSuccess: onClose },
          )
        }
      >
        Submit prescription
      </Button>
    </DrawerShell>
  );
}

function DrawerShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="flex-1 bg-black/30" aria-label="Close" onClick={onClose} />
      <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
