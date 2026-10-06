"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
import {
  DoctorLabOrdersPanel,
  useDoctorLabOrderCounts,
} from "@/components/doctor/doctor-lab-orders-panel";
import { labOrderStatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/format/money";
import { DiagnosisType, QueueStation } from "@/types/encounter";
import { useLabOrders } from "@/features/laboratory/hooks";
import { useInvoice } from "@/features/billing/hooks";
import {
  useCreatePrescription,
  useMedicines,
  usePrescriptions,
} from "@/features/prescriptions/hooks";
import { toast } from "sonner";
import { LabOrderStatus } from "@/types/lab";

type Step = "notes" | "orders" | "history" | "finish";

function nextStopLabel(status: string): string {
  switch (status) {
    case "WAITING_LAB":
      return "Laboratory";
    case "WAITING_PHARMACY":
      return "Pharmacy";
    case "WAITING_PAYMENT":
      return "Cashier / payment";
    case "WAITING_REVIEW":
      return "Doctor review (lab)";
    case "COMPLETED":
      return "Visit completed";
    default:
      return status.replaceAll("_", " ");
  }
}

export function DoctorConsultationWorkspace({
  encounterId,
}: {
  encounterId: string;
}) {
  const encounter = useEncounter(encounterId);
  const consultationQuery = useConsultation(encounterId);
  const save = useSaveConsultation(encounterId);
  const [workflowStep, setWorkflowStep] = useState<Step>("notes");
  const [orderSubTab, setOrderSubTab] = useState<"lab" | "rx">("lab");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [ensuringDraft, setEnsuringDraft] = useState(false);
  const requestBilling = useRequestBilling(encounterId);
  const routePatient = useRouteEncounter(encounterId);

  const consultation = consultationQuery.data;
  const consultationId = consultation?.id;
  const isFinalized = consultation?.status === "FINALIZED";
  const labCounts = useDoctorLabOrderCounts(consultationId);
  const finalize = useFinalizeConsultation(consultationId ?? "", encounterId, {
    redirect: false,
  });

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

  // When lab returns results, open Orders → Laboratory once (results view)
  const didAutoOpenResults = useRef(false);
  useEffect(() => {
    if (didAutoOpenResults.current) return;
    if (labCounts.ready > 0 || encounter.data?.status === "WAITING_REVIEW") {
      didAutoOpenResults.current = true;
      setWorkflowStep("orders");
      setOrderSubTab("lab");
    }
  }, [labCounts.ready, encounter.data?.status]);

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
      toast.error("Save the notes first, then try again");
      return null;
    } finally {
      setEnsuringDraft(false);
    }
  }

  async function goToStep(id: Step) {
    setWorkflowStep(id);
    if (id === "orders" && !consultationId) {
      await ensureConsultation();
    }
    if (id === "history") setHistoryOpen(true);
  }

  if (encounter.isLoading || consultationQuery.isLoading) {
    return <LoadingBlock label="Loading consultation workspace" />;
  }
  if (encounter.isError || !encounter.data?.patient) {
    return <ErrorState message="Encounter could not be loaded." />;
  }

  const patient = encounter.data.patient;
  const triage = encounter.data.triage as Record<string, unknown> | null;
  const encounterStatus = encounter.data.status;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <PatientIdentityBar
            patient={patient}
            encounterNumber={encounter.data.encounterNumber}
            encounterStatus={encounterStatus}
            assignedDoctor={encounter.data.assignedDoctor}
          />
        </div>
        <DoctorPatientChartPanel
          patientId={patient.id}
          encounterId={encounterId}
          compact
          open={historyOpen}
          onOpenChange={(open) => {
            setHistoryOpen(open);
            if (open) setWorkflowStep("history");
          }}
        />
      </div>

      {pendingDraft && !isFinalized ? (
        <FormDraftBanner
          savedAt={pendingDraft.savedAt}
          onRestore={() => form.reset(pendingDraft.values)}
          onDiscard={dismissDraft}
        />
      ) : null}

      {isFinalized ? (
        <div
          className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-950"
          role="status"
        >
          <p className="font-semibold">Consultation completed</p>
          <p className="mt-1">
            Patient left your queue and was sent to{" "}
            <strong>{nextStopLabel(encounterStatus)}</strong>.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-teal-300 bg-white"
              onClick={() => setHistoryOpen(true)}
            >
              View history (read-only)
            </Button>
            <Link href="/doctor">
              <Button type="button" size="sm">
                Back to doctor queue
              </Button>
            </Link>
          </div>
        </div>
      ) : null}

      {labCounts.ready > 0 && !isFinalized && workflowStep !== "orders" ? (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950"
          role="status"
        >
          <span>Lab results ready — review on Orders → Laboratory.</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-emerald-300 bg-white"
            onClick={() => {
              setOrderSubTab("lab");
              void goToStep("orders");
            }}
          >
            View results
          </Button>
        </div>
      ) : null}

      <nav
        className="flex flex-wrap gap-2 border-b border-slate-200 pb-2"
        aria-label="Doctor workflow"
      >
        {(
          [
            ["notes", "1. Notes"],
            ["orders", "2. Orders"],
            ["finish", "3. Finish"],
            ["history", "History"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={cn(
              "relative rounded-md px-3 py-1.5 text-sm font-medium",
              workflowStep === id
                ? "bg-teal-800 text-white"
                : id === "history"
                  ? "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200",
              id === "orders" &&
                labCounts.ready > 0 &&
                workflowStep !== "orders" &&
                "ring-1 ring-emerald-500",
            )}
            onClick={() => void goToStep(id)}
          >
            {label}
            {id === "orders" &&
            (labCounts.ready > 0 || labCounts.waiting > 0) ? (
              <span
                className={cn(
                  "ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-bold",
                  workflowStep === "orders"
                    ? "bg-white/20 text-white"
                    : labCounts.ready > 0
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-500 text-white",
                )}
              >
                {labCounts.ready > 0 ? labCounts.ready : labCounts.waiting}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      <p className="text-xs text-slate-500">
        {workflowStep === "notes"
          ? "1 · Document this visit, then go to Orders."
          : workflowStep === "orders"
            ? labCounts.ready > 0
              ? "2 · Review lab results. Add medicines if needed, then Finish."
              : "2 · Lab and medicines. Save Rx, or save & send to pharmacy."
            : workflowStep === "finish"
              ? "3 · Send to pharmacy, front desk, or complete the visit."
              : "Past visits and results (read-only) — also via History at the top."}
      </p>

      {ensuringDraft ? (
        <p className="text-sm text-slate-600">Saving notes…</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-12">
        <aside className="space-y-3 lg:col-span-3">
          <Panel title="Triage (this visit)">
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
            <Panel title="Orders">
              <p className="text-xs text-slate-500">
                Save notes first to order lab or medicines.
              </p>
            </Panel>
          )}
        </aside>

        <section className="space-y-4 lg:col-span-9">
          {workflowStep === "notes" ? (
            <div className="space-y-4">
              <form
                className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                onSubmit={form.handleSubmit((values) =>
                  save.mutate(values, { onSuccess: () => clearDraft() }),
                )}
              >
                <h2 className="text-sm font-semibold text-slate-800">
                  Visit notes
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
                <Field label="Plan / follow-up">
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
                      {save.isPending ? "Saving…" : "Save notes"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void goToStep("orders")}
                    >
                      Next: Orders
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setHistoryOpen(true);
                        setWorkflowStep("history");
                      }}
                    >
                      View history
                    </Button>
                  </div>
                ) : null}
              </form>

              <DiagnosisTab
                consultationId={consultationId}
                encounterId={encounterId}
                diagnoses={consultation?.diagnoses ?? []}
                isFinalized={isFinalized}
                onNeedDraft={() => void ensureConsultation()}
              />
            </div>
          ) : null}

          {workflowStep === "orders" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium",
                    orderSubTab === "lab"
                      ? "bg-teal-800 text-white"
                      : "bg-slate-100 text-slate-700",
                  )}
                  onClick={() => setOrderSubTab("lab")}
                >
                  Laboratory
                  {labCounts.ready > 0 ? (
                    <span
                      className={cn(
                        "ml-1.5 inline-flex min-w-[1.1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold",
                        orderSubTab === "lab"
                          ? "bg-white/20 text-white"
                          : "bg-emerald-600 text-white",
                      )}
                    >
                      {labCounts.ready}
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium",
                    orderSubTab === "rx"
                      ? "bg-teal-800 text-white"
                      : "bg-slate-100 text-slate-700",
                  )}
                  onClick={() => setOrderSubTab("rx")}
                >
                  Medicines
                </button>
              </div>
              {orderSubTab === "lab" ? (
                <DoctorLabOrdersPanel
                  consultationId={consultationId}
                  isFinalized={isFinalized}
                  preferResults={
                    labCounts.ready > 0 ||
                    encounter.data?.status === "WAITING_REVIEW"
                  }
                  onNeedDraft={() => void ensureConsultation()}
                  onSentToLab={() => routePatient.mutate(QueueStation.LAB)}
                />
              ) : (
                <PrescriptionTab
                  consultationId={consultationId}
                  isFinalized={isFinalized}
                  onNeedDraft={() => void ensureConsultation()}
                  onSentToPharmacy={() =>
                    routePatient.mutate(QueueStation.PHARMACY)
                  }
                  onGoFinish={() => void goToStep("finish")}
                />
              )}
              {!isFinalized ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => void goToStep("finish")}
                  >
                    Next: Finish
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setHistoryOpen(true);
                      setWorkflowStep("history");
                    }}
                  >
                    View history
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {workflowStep === "history" ? (
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800">
                Patient history (read-only)
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Past visits, which doctor saw them, lab results, and medicines.
                Nothing here is editable.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" onClick={() => setHistoryOpen(true)}>
                  Open full history
                </Button>
                <Link href={`/patients/${patient.id}`}>
                  <Button type="button" variant="outline">
                    Patient profile
                  </Button>
                </Link>
              </div>
              <div className="mt-4">
                <DoctorPatientChartPanel
                  patientId={patient.id}
                  encounterId={encounterId}
                  open={historyOpen}
                  onOpenChange={setHistoryOpen}
                />
              </div>
            </div>
          ) : null}

          {workflowStep === "finish" ? (
            <FinishNextSteps
              consultationId={consultationId}
              encounterStatus={encounterStatus}
              invoiceMeta={encounter.data.invoice}
              isFinalized={Boolean(isFinalized)}
              finalizePending={finalize.isPending}
              billingPending={requestBilling.isPending}
              routePending={routePatient.isPending}
              onComplete={() =>
                finalize.mutate(undefined, {
                  onSuccess: () => setWorkflowStep("finish"),
                })
              }
              onPharmacy={() => routePatient.mutate(QueueStation.PHARMACY)}
              onFrontDesk={() => requestBilling.mutate()}
            />
          ) : null}
        </section>
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

/** After notes/orders/lab — choose pharmacy or front desk; show money clearly. No imaging yet. */
function FinishNextSteps({
  consultationId,
  encounterStatus,
  invoiceMeta,
  isFinalized,
  finalizePending,
  billingPending,
  routePending,
  onComplete,
  onPharmacy,
  onFrontDesk,
}: {
  consultationId?: string;
  encounterStatus: string;
  invoiceMeta?: { id: string; invoiceNumber: string; status: string } | null;
  isFinalized: boolean;
  finalizePending: boolean;
  billingPending: boolean;
  routePending: boolean;
  onComplete: () => void;
  onPharmacy: () => void;
  onFrontDesk: () => void;
}) {
  const invoice = useInvoice(invoiceMeta?.id ?? null);
  const rxList = usePrescriptions();
  const labs = useLabOrders();

  const myRx =
    rxList.data?.filter((p) => p.consultationId === consultationId) ?? [];
  const activeRx = myRx.filter((p) =>
    ["ACTIVE", "PARTIAL"].includes(p.status),
  );
  const myLabs =
    labs.data?.filter((o) => o.consultationId === consultationId) ?? [];
  const pendingLab = myLabs.filter(
    (o) =>
      o.status !== LabOrderStatus.VERIFIED &&
      o.status !== LabOrderStatus.CANCELLED,
  );
  const readyLab = myLabs.filter((o) => o.status === LabOrderStatus.VERIFIED);

  const inv = invoice.data;
  const balance = inv ? inv.totalCents - inv.paidCents : null;
  const busy = finalizePending || billingPending || routePending;

  const suggested =
    pendingLab.length > 0
      ? "Lab still has open orders — patient may need lab first."
      : activeRx.length > 0
        ? "Medicines prescribed — usually send to pharmacy next."
        : balance !== null && balance > 0
          ? "Balance due — send to front desk / cashier."
          : "No open pharmacy orders — front desk or complete is fine.";

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">
          After lab results — where next?
        </h2>
        <p className="mt-1 text-sm text-slate-600">{suggested}</p>
        <p className="mt-1 text-xs text-slate-500">
          Imaging / X-ray is not available in this build yet.
        </p>
      </div>

      {/* Money summary */}
      <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Money this visit</h2>
        {!invoiceMeta ? (
          <p className="mt-2 text-sm text-slate-600">
            No invoice yet — front desk can create billing when the patient
            arrives.
          </p>
        ) : invoice.isLoading ? (
          <p className="mt-2 text-sm text-slate-500">Loading invoice…</p>
        ) : inv ? (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-xs text-slate-500">
                  {inv.invoiceNumber} · {inv.status}
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {balance !== null && balance > 0
                    ? formatCents(balance)
                    : formatCents(0)}
                </p>
                <p className="text-xs text-slate-600">
                  {balance !== null && balance > 0
                    ? "Still to pay"
                    : inv.status === "PAID" || (balance !== null && balance <= 0)
                      ? "Paid in full"
                      : "Balance"}
                </p>
              </div>
              <div className="text-right text-xs text-slate-600">
                <p>Total {formatCents(inv.totalCents)}</p>
                <p>Paid {formatCents(inv.paidCents)}</p>
              </div>
            </div>
            {inv.items.length > 0 ? (
              <ul className="divide-y divide-teal-100/80 rounded-md border border-teal-100 bg-white text-sm">
                {inv.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-2 px-3 py-2"
                  >
                    <span className="text-slate-800">
                      {item.description}
                      <span className="ml-1 text-xs text-slate-500">
                        ×{item.quantity}
                      </span>
                    </span>
                    <span className="shrink-0 font-medium text-slate-900">
                      {formatCents(item.totalCents)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            Invoice {invoiceMeta.invoiceNumber} · {invoiceMeta.status}
          </p>
        )}
      </div>

      {/* This visit checklist */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">This visit</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
          <li>
            Lab:{" "}
            {readyLab.length > 0
              ? `${readyLab.length} result${readyLab.length === 1 ? "" : "s"} ready`
              : "None ready"}
            {pendingLab.length > 0
              ? ` · ${pendingLab.length} still at lab`
              : ""}
          </li>
          <li>
            Medicines:{" "}
            {activeRx.length > 0
              ? `${activeRx.length} prescription${activeRx.length === 1 ? "" : "s"}`
              : "None"}
          </li>
        </ul>
      </div>

      {/* Destinations */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Pharmacy</h3>
          <p className="mt-1 text-xs text-slate-600">
            Dispense prescribed medicines.{" "}
            {activeRx.length === 0
              ? "No active prescription yet — add medicines under Orders first, or still send if needed."
              : `${activeRx.length} prescription ready.`}
          </p>
          {!isFinalized ? (
            <Button
              type="button"
              className="mt-3"
              disabled={busy}
              onClick={onPharmacy}
            >
              {routePending ? "Sending…" : "Send to pharmacy"}
            </Button>
          ) : null}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">
            Front desk / cashier
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            {balance !== null && balance > 0
              ? `Collect ${formatCents(balance)} and close billing.`
              : balance !== null && balance <= 0
                ? "Invoice already paid — desk can still check them out."
                : "Desk will bill and take payment."}
          </p>
          {!isFinalized ? (
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              disabled={busy}
              onClick={onFrontDesk}
            >
              {billingPending ? "Sending…" : "Send to front desk"}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">
          Or complete consultation
        </h3>
        <p className="mt-1 text-xs text-slate-600">
          Removes patient from your queue. System picks lab (if open orders),
          pharmacy (if medicines), or payment.
        </p>
        {consultationId && !isFinalized ? (
          <Button
            type="button"
            variant="secondary"
            className="mt-3"
            disabled={busy}
            onClick={onComplete}
          >
            {finalizePending ? "Completing…" : "Complete consultation"}
          </Button>
        ) : null}
        {isFinalized ? (
          <p className="mt-3 text-sm text-slate-700">
            Already completed → {nextStopLabel(encounterStatus)}.
          </p>
        ) : null}
      </div>
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
        <p className="text-sm text-slate-600">
          Save notes above first, then add diagnoses.
        </p>
        <Button type="button" className="mt-2" onClick={onNeedDraft}>
          Save notes
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">Diagnoses</h2>
      {diagnoses.length > 0 ? (
        <ul className="space-y-1 text-sm text-slate-700">
          {diagnoses.map((d) => (
            <li key={d.id}>
              {d.isPrimary ? "★ " : ""}
              {d.label}
              {d.type ? ` (${d.type})` : ""}
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

function PrescriptionTab({
  consultationId,
  isFinalized,
  onNeedDraft,
  onSentToPharmacy,
  onGoFinish,
}: {
  consultationId?: string;
  isFinalized: boolean;
  onNeedDraft: () => void;
  onSentToPharmacy: () => void;
  onGoFinish: () => void;
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
        <p className="text-sm text-slate-600">Save notes first.</p>
        <Button type="button" className="mt-2" onClick={onNeedDraft}>
          Save notes
        </Button>
      </div>
    );
  }

  function toggleMed(id: string) {
    setSelectedMeds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function buildBody(sendToPharmacy: boolean) {
    return {
      sendToPharmacy,
      items: selectedMeds.map((medicineId) => ({
        medicineId,
        dose,
        route,
        frequency,
        duration,
        quantity,
      })),
    };
  }

  function afterSave(sent: boolean) {
    setSelectedMeds([]);
    if (sent) onSentToPharmacy();
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">Medicines</h2>

      {!isFinalized ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-600">
            Select medicines — save now, or save and send to pharmacy
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
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!selectedMeds.length || create.isPending}
              onClick={() =>
                create.mutate(buildBody(false), {
                  onSuccess: () => afterSave(false),
                })
              }
            >
              {create.isPending ? "Saving…" : `Save (${selectedMeds.length})`}
            </Button>
            <Button
              type="button"
              disabled={!selectedMeds.length || create.isPending}
              onClick={() =>
                create.mutate(buildBody(true), {
                  onSuccess: () => afterSave(true),
                })
              }
            >
              {create.isPending
                ? "Sending…"
                : `Save & send to pharmacy (${selectedMeds.length})`}
            </Button>
            <Button type="button" variant="ghost" onClick={onGoFinish}>
              Next: Finish
            </Button>
          </div>
        </div>
      ) : null}

      <div className="border-t border-slate-100 pt-3">
        <p className="mb-2 text-xs font-medium text-slate-600">
          Prescriptions this visit
        </p>
        {myRx.length === 0 ? (
          <p className="text-sm text-slate-500">None yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {myRx.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2">
                <span>
                  {p.prescriptionNumber} — {p.status}
                </span>
                <span className="text-xs text-slate-500">
                  {p.items?.map((i) => i.medicine?.name).filter(Boolean).join(", ")}
                </span>
              </li>
            ))}
          </ul>
        )}
        {!isFinalized && myRx.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={onSentToPharmacy}>
              Send patient to pharmacy
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onGoFinish}
            >
              Go to Finish
            </Button>
          </div>
        ) : null}
      </div>
    </div>
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
    <Panel title="This visit orders">
      <p className="text-xs font-medium text-slate-700">Laboratory</p>
      {labItems.length === 0 ? (
        <p className="mb-2 text-xs text-slate-500">None</p>
      ) : (
        <ul className="mb-2 space-y-1.5 text-xs">
          {labItems.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium text-slate-800">{o.orderNumber}</span>
              {labOrderStatusBadge(o.status)}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs font-medium text-slate-700">Medicines</p>
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
