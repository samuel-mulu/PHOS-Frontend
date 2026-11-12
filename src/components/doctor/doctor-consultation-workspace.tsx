"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PatientIdentityBar } from "@/components/shared/patient-identity-bar";
import { PaymentRequestPanel } from "@/components/shared/payment-request-panel";
import {
  ErrorState,
  LoadingBlock,
  WorkspacePageSkeleton,
} from "@/components/shared/state-blocks";
import {
  useEncounter,
  useRouteEncounter,
} from "@/features/encounters/hooks";
import {
  consultationSchema,
  type ConsultationFormValues,
} from "@/features/consultations/schemas";
import {
  useConsultation,
  useFinalizeConsultation,
  useSaveConsultation,
} from "@/features/consultations/hooks";
import { DoctorPatientChartPanel } from "@/components/doctor/doctor-patient-chart-panel";
import { ClinicalNotesThread } from "@/components/shared/clinical-notes-thread";
import {
  DoctorLabOrdersPanel,
  useDoctorLabOrderCounts,
} from "@/components/doctor/doctor-lab-orders-panel";
import { DoctorUltrasoundPanel } from "@/components/doctor/doctor-ultrasound-panel";
import { DoctorNursePanel } from "@/components/doctor/doctor-nurse-panel";
import { DoctorMaternalHealthPanel } from "@/components/doctor/doctor-maternal-health-panel";
import { DoctorFamilyPlanningPanel } from "@/components/doctor/doctor-family-planning-panel";
import { labOrderStatusBadge, StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/format/money";
import {
  invoiceDueNow,
  invoiceLineStates,
  invoicePayLater,
} from "@/lib/billing/invoice-state";
import { LineStateBadge } from "@/components/shared/status-badge";
import { uniquePanelLabels } from "@/lib/lab/panels";
import { QueueStation } from "@/types/encounter";
import { useLabOrders } from "@/features/laboratory/hooks";
import { useInvoice } from "@/features/billing/hooks";
import {
  useCreatePrescription,
  useMedicines,
  usePrescriptions,
} from "@/features/prescriptions/hooks";
import { toast } from "sonner";
import { LabOrderStatus } from "@/types/lab";
import { isUltrasoundDescription } from "@/lib/clinical/ultrasound";
import { format } from "date-fns";
import {
  useAppointments,
  useCreateAppointment,
} from "@/features/appointments/hooks";
import { AppointmentStatus } from "@/types/appointment";
import { PrintVisitNote } from "@/components/print/print-visit-note";
import { PrintReferralSheet } from "@/components/print/print-referral-sheet";
import { PrintPatientLabReport } from "@/components/print/print-patient-lab-report";
import { PrintMedicalCertificate } from "@/components/print/print-medical-certificate";
import { PrintObstetricUsReport } from "@/components/print/print-obstetric-us-report";
import type { ObstetricUsReportFormValues } from "@/features/consultations/obstetric-us-report";

type Step =
  | "notes"
  | "orders"
  | "finish"
  | "maternal"
  | "familyPlanning"
  | "history";

function nextStopLabel(status: string): string {
  switch (status) {
    case "WAITING_LAB":
      return "Laboratory";
    case "WAITING_PHARMACY":
      return "Pharmacy";
    case "WAITING_PAYMENT":
      return "Cashier / payment";
    case "WAITING_TRIAGE":
      return "Nurse / triage";
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
  const [orderSubTab, setOrderSubTab] = useState<
    "lab" | "rx" | "ultrasound" | "nurse"
  >("lab");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [ensuringDraft, setEnsuringDraft] = useState(false);
  const routePatient = useRouteEncounter(encounterId);

  const consultation = consultationQuery.data;
  const consultationId = consultation?.id;
  const isFinalized = consultation?.status === "FINALIZED";
  const labCounts = useDoctorLabOrderCounts(consultationId);
  const allLabOrders = useLabOrders();
  const consultationLabOrders = useMemo(
    () =>
      (allLabOrders.data ?? []).filter(
        (o) => o.consultationId === consultationId,
      ),
    [allLabOrders.data, consultationId],
  );
  const laboratoryTestsSummary = useMemo(
    () =>
      consultationLabOrders
        .flatMap((order) =>
          (order.items ?? []).map(
            (item) => item.labTest?.name ?? item.labTestId ?? "Lab test",
          ),
        )
        .filter(Boolean)
        .join(", "),
    [consultationLabOrders],
  );
  const finalize = useFinalizeConsultation(consultationId ?? "", encounterId);
  const form = useForm<ConsultationFormValues>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      chiefComplaint: "",
      historyPresentIllness: "",
      physicalExam: "",
      assessment: "",
      plan: "",
      notes: "",
      labNotes: "",
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
        labNotes: consultation.labNotes ?? "",
      });
    }
  }, [consultation, form]);

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

  async function saveObstetricUsReport(obstetricUsReport: ObstetricUsReportFormValues) {
    await save.mutateAsync({ ...form.getValues(), obstetricUsReport });
  }

  async function ensureConsultation(): Promise<string | null> {
    if (consultationId) return consultationId;
    setEnsuringDraft(true);
    try {
      const values = form.getValues();
      const saved = await save.mutateAsync(values);
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
    return <WorkspacePageSkeleton label="Loading consultation workspace" />;
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
            visitNumber={encounter.data.visitNumber}
            encounterStatus={encounterStatus}
            assignedDoctor={encounter.data.assignedDoctor}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PrintPatientLabReport
            patientId={patient.id}
            patientLabel={[patient.firstName, patient.lastName]
              .filter(Boolean)
              .join(" ")}
            triggerLabel="Patient lab report"
          />
          <PrintVisitNote encounter={encounter.data} />
          <PrintReferralSheet
            encounter={encounter.data}
            consultation={consultation}
            laboratoryTestsSummary={laboratoryTestsSummary}
            saving={save.isPending}
            onSave={async (referralSheet) => {
              await save.mutateAsync({ ...form.getValues(), referralSheet });
            }}
          />
          <PrintMedicalCertificate
            encounter={encounter.data}
            consultation={consultation}
          />
          <PrintObstetricUsReport
            encounter={encounter.data}
            consultation={consultation}
            saving={save.isPending}
            locked={isFinalized}
            onSave={saveObstetricUsReport}
          />
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
      </div>

      {isFinalized ? (
        <div
          className="rounded-lg border border-teal-700/40 bg-teal-950/30 px-4 py-3 text-sm text-teal-50 dark:border-teal-600/40"
          role="status"
        >
          <p className="font-semibold text-teal-100">Consultation completed</p>
          <p className="mt-1 text-teal-100/85">
            Patient left your queue and was sent to{" "}
            <strong>{nextStopLabel(encounterStatus)}</strong>.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setHistoryOpen(true)}
            >
              View history (read-only)
            </Button>
            <Link href="/doctor">
              <Button type="button" size="sm">
                Doctor queue
              </Button>
            </Link>
          </div>
        </div>
      ) : null}

      {labCounts.ready > 0 && !isFinalized && workflowStep !== "orders" ? (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-red-700/50 bg-red-950/40 px-3 py-2 text-sm text-red-100"
          role="status"
        >
          <span>
            {labCounts.ready} lab result
            {labCounts.ready === 1 ? "" : "s"} ready - open Orders → Laboratory.
          </span>
          <Button
            type="button"
            size="sm"
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
        className="flex flex-nowrap gap-2 overflow-x-auto border-b border-border pb-2"
        aria-label="Doctor workflow"
      >
        {(
          [
            ["notes", "1. Notes"],
            ["orders", "2. Orders"],
            ["finish", "3. Finish"],
            ["maternal", "Maternal"],
            ["familyPlanning", "FP"],
            ["history", "History"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={cn(
              "relative shrink-0 rounded-md px-3 py-1.5 text-sm font-medium",
              workflowStep === id
                ? "bg-teal-700 text-white shadow-sm dark:bg-primary"
                : "bg-slate-100 text-slate-800 ring-1 ring-slate-200 hover:bg-slate-200 dark:bg-muted-bg dark:text-foreground dark:ring-border dark:hover:bg-hover-strong",
              id === "orders" &&
                labCounts.ready > 0 &&
                workflowStep !== "orders" &&
                "ring-1 ring-red-500",
            )}
            onClick={() => void goToStep(id)}
          >
            {label}
            {id === "orders" && labCounts.ready > 0 ? (
              <span
                className={cn(
                  "ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1 text-3xs font-bold",
                  workflowStep === "orders"
                    ? "bg-white/20 text-white"
                    : "bg-red-600 text-white",
                )}
              >
                {labCounts.ready}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      <p className="text-xs text-muted">
        {workflowStep === "notes"
          ? "1 · Document this visit, then go to Orders."
          : workflowStep === "orders"
            ? labCounts.ready > 0
              ? "2 · Review lab results. Medicines, cashier, or appointment - then Finish."
              : "2 · Lab, medicines, nurse/triage, send to cashier, or book a follow-up."
            : workflowStep === "finish"
              ? "3 · Send to pharmacy if needed, then complete this visit."
              : workflowStep === "maternal"
                ? "Maternal · Obstetric history, ANC, labor, and delivery for this patient."
                : workflowStep === "familyPlanning"
                  ? "FP · Family planning counseling, method, and follow-up."
                  : "Past visits and results (read-only) - also via History at the top."}
      </p>

      {ensuringDraft ? (
        <p className="text-sm text-muted">Saving notes…</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-12">
        <aside className="space-y-3 lg:col-span-3">
          <Panel title="Triage (this visit)">
            {triage ? (
              <div className="space-y-2">
                {(triage.mchNeeded === true ||
                  triage.fpNeeded === true ||
                  triage.pregnancySuspected === true) && (
                  <div className="flex flex-wrap gap-1.5">
                    {triage.pregnancySuspected === true ? (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-3xs font-semibold text-rose-900">
                        Pregnancy suspected
                      </span>
                    ) : null}
                    {triage.mchNeeded === true ? (
                      <span className="rounded-full bg-teal-100 px-2 py-0.5 text-3xs font-semibold text-teal-900">
                        MCH needed
                      </span>
                    ) : null}
                    {triage.fpNeeded === true ? (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-3xs font-semibold text-sky-900">
                        FP needed
                      </span>
                    ) : null}
                  </div>
                )}
                <ul className="space-y-1 text-xs text-foreground">
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
              </div>
            ) : (
              <p className="text-xs text-muted">No triage recorded.</p>
            )}
          </Panel>
          {consultationId ? (
            <VisitSideCards
              consultationId={consultationId}
              invoiceId={encounter.data.invoice?.id}
              encounterStatus={encounterStatus}
              paymentReturnStation={encounter.data.paymentReturnStation}
              ultrasoundPlan={form.watch("plan") || consultation?.plan}
            />
          ) : (
            <>
              <Panel title="Laboratory">
                <p className="text-xs text-muted">
                  Save notes first to order lab or medicines.
                </p>
              </Panel>
              <Panel title="Ultrasound">
                <p className="text-xs text-muted">None</p>
              </Panel>
            </>
          )}
        </aside>

        <section className="space-y-4 lg:col-span-9">
          {workflowStep === "notes" ? (
            <form
              className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm"
              onSubmit={form.handleSubmit((values) => save.mutate(values))}
            >
              <h2 className="text-sm font-semibold text-foreground">
                Visit notes
              </h2>
              <p className="text-xs text-muted">
                Same sections as the printed visit note. After you save, typing
                2+ characters shows your recent phrases for that field.
              </p>
              <div>
                <Label className="mb-1 block text-xs font-medium text-foreground">
                  Vitals
                </Label>
                <Textarea
                  rows={3}
                  disabled={isFinalized}
                  placeholder="e.g. BP 120/80, Temp 36.5, HR 72, Weight 70kg, Height 170cm"
                  className="min-h-[4.5rem] resize-y"
                  {...form.register("physicalExam")}
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs font-medium text-foreground">
                  Medical Notes / Follow-up Plan / Recommendations
                </Label>
                <Textarea
                  rows={4}
                  disabled={isFinalized}
                  placeholder="e.g. follow-up in 2 weeks, rest, increase fluids…"
                  className="min-h-[5.5rem] resize-y"
                  {...form.register("notes")}
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs font-medium text-foreground">
                  Lab notes
                </Label>
                <Textarea
                  rows={3}
                  disabled={isFinalized}
                  placeholder="e.g. CBC pending, correlate with fever; previous Hb low…"
                  className="min-h-[4.5rem] resize-y"
                  {...form.register("labNotes")}
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs font-medium text-foreground">
                  Diagnosis
                </Label>
                <Textarea
                  rows={3}
                  disabled={isFinalized}
                  placeholder="e.g. Acute gastritis"
                  className="min-h-[4.5rem] resize-y"
                  {...form.register("assessment")}
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs font-medium text-foreground">
                  Ultrasound
                </Label>
                <Textarea
                  rows={3}
                  disabled={isFinalized}
                  placeholder="e.g. findings…"
                  className="min-h-[4.5rem] resize-y font-mono text-sm"
                  {...form.register("plan")}
                />
              </div>
              <PrintObstetricUsReport
                encounter={encounter.data}
                consultation={consultation}
                saving={save.isPending}
                locked={isFinalized}
                onSave={saveObstetricUsReport}
              />
              <div>
                <Label className="mb-1 block text-xs font-medium text-foreground">
                  Prescription (Rx)
                </Label>
                <Textarea
                  rows={4}
                  disabled={isFinalized}
                  placeholder={"e.g.\nAmoxicillin 500mg - 1x3x7 days"}
                  className="min-h-[5.5rem] resize-y"
                  {...form.register("historyPresentIllness")}
                />
              </div>
              {!isFinalized ? (
                <div className="flex flex-wrap gap-2 pt-1">
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
                      : "bg-muted-bg text-foreground",
                  )}
                  onClick={() => setOrderSubTab("lab")}
                >
                  Laboratory
                  {labCounts.ready > 0 ? (
                    <span
                      className={cn(
                        "ml-1.5 inline-flex min-w-[1.1rem] items-center justify-center rounded-full px-1 text-3xs font-bold",
                        orderSubTab === "lab"
                          ? "bg-white/20 text-white"
                          : "bg-red-600 text-white",
                      )}
                    >
                      {labCounts.ready}
                    </span>
                  ) : labCounts.waiting > 0 && orderSubTab !== "lab" ? (
                    <span className="ml-1.5 inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-amber-500 px-1 text-3xs font-bold text-white">
                      {labCounts.waiting}
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium",
                    orderSubTab === "rx"
                      ? "bg-teal-800 text-white"
                      : "bg-muted-bg text-foreground",
                  )}
                  onClick={() => setOrderSubTab("rx")}
                >
                  Medicines
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium",
                    orderSubTab === "ultrasound"
                      ? "bg-teal-800 text-white"
                      : "bg-muted-bg text-foreground",
                  )}
                  onClick={() => setOrderSubTab("ultrasound")}
                >
                  Ultrasound
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium",
                    orderSubTab === "nurse"
                      ? "bg-teal-800 text-white"
                      : "bg-muted-bg text-foreground",
                  )}
                  onClick={() => setOrderSubTab("nurse")}
                >
                  Nurse / triage
                </button>
              </div>
              {orderSubTab === "lab" ? (
                <DoctorLabOrdersPanel
                  consultationId={consultationId}
                  encounterId={encounterId}
                  patientId={patient.id}
                  patientLabel={[patient.firstName, patient.lastName]
                    .filter(Boolean)
                    .join(" ")}
                  isFinalized={isFinalized}
                  visitLabNotes={form.watch("labNotes") || consultation?.labNotes}
                  preferResults={
                    labCounts.ready > 0 ||
                    encounter.data?.status === "WAITING_REVIEW"
                  }
                  encounterStatus={encounter.data?.status}
                  paymentReturnStation={encounter.data?.paymentReturnStation}
                  onNeedDraft={() => void ensureConsultation()}
                  onSentToLab={() => routePatient.mutate(QueueStation.LAB)}
                />
              ) : orderSubTab === "ultrasound" ? (
                <DoctorUltrasoundPanel
                  encounterId={encounterId}
                  isFinalized={isFinalized}
                  encounterStatus={encounter.data?.status}
                  paymentReturnStation={encounter.data?.paymentReturnStation}
                  invoiceId={encounter.data?.invoice?.id}
                  disabled={ensuringDraft}
                />
              ) : orderSubTab === "nurse" ? (
                <DoctorNursePanel
                  encounterId={encounterId}
                  isFinalized={isFinalized}
                  alreadyWithNurse={
                    encounter.data?.status === "WAITING_TRIAGE" ||
                    encounter.data?.status === "IN_TRIAGE" ||
                    Boolean(encounter.data?.nurseReferralActive)
                  }
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

              <OrdersCashierAppointment
                encounterId={encounterId}
                patientId={patient.id}
                departmentId={encounter.data.departmentId}
                serviceId={encounter.data.serviceId}
                encounterStatus={encounterStatus}
                paymentReturnStation={encounter.data.paymentReturnStation}
                isFinalized={Boolean(isFinalized)}
                routePending={routePatient.isPending}
              />

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

          {workflowStep === "maternal" ? (
            <div className="space-y-4">
              <DoctorMaternalHealthPanel
                patientId={patient.id}
                encounterId={encounterId}
                readOnly={isFinalized}
              />
              <DoctorNursePanel
                encounterId={encounterId}
                isFinalized={isFinalized}
                alreadyWithNurse={
                  encounter.data?.status === "WAITING_TRIAGE" ||
                  encounter.data?.status === "IN_TRIAGE" ||
                  Boolean(encounter.data?.nurseReferralActive)
                }
              />
            </div>
          ) : null}

          {workflowStep === "familyPlanning" ? (
            <div className="space-y-4">
              <DoctorFamilyPlanningPanel
                patientId={patient.id}
                encounterId={encounterId}
                readOnly={isFinalized}
              />
              <DoctorNursePanel
                encounterId={encounterId}
                isFinalized={isFinalized}
                alreadyWithNurse={
                  encounter.data?.status === "WAITING_TRIAGE" ||
                  encounter.data?.status === "IN_TRIAGE" ||
                  Boolean(encounter.data?.nurseReferralActive)
                }
              />
            </div>
          ) : null}

          {workflowStep === "history" ? (
            <div className="space-y-4">
              <ClinicalNotesThread
                encounterId={encounterId}
                readOnly
                title="This visit · clinical notes (doctor ↔ lab)"
              />
              <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-foreground">
                  Patient history (read-only)
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Past visits, which doctor saw them, lab results, medicines,
                  and clinical notes.
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
            </div>
          ) : null}

          {workflowStep === "finish" ? (
            <FinishNextSteps
              consultationId={consultationId}
              invoiceId={encounter.data.invoice?.id}
              encounterStatus={encounterStatus}
              paymentReturnStation={encounter.data.paymentReturnStation}
              isFinalized={Boolean(isFinalized)}
              finalizePending={finalize.isPending}
              routePending={routePatient.isPending}
              onComplete={() => finalize.mutate()}
              onPharmacy={() => routePatient.mutate(QueueStation.PHARMACY)}
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
    <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function defaultFollowUpLocal() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(9, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Cashier charge + follow-up booking - lives on Orders (with lab / Rx / US). */
function OrdersCashierAppointment({
  encounterId,
  patientId,
  departmentId,
  serviceId,
  encounterStatus,
  paymentReturnStation,
  isFinalized,
  routePending,
}: {
  encounterId: string;
  patientId: string;
  departmentId: string;
  serviceId?: string | null;
  encounterStatus: string;
  paymentReturnStation?: string | null;
  isFinalized: boolean;
  routePending: boolean;
}) {
  const createAppt = useCreateAppointment();
  const appts = useAppointments();
  const [scheduledAt, setScheduledAt] = useState(defaultFollowUpLocal);
  const [scheduleNotes, setScheduleNotes] = useState("");

  const followUps = (appts.data ?? []).filter(
    (a) =>
      a.patientId === patientId && a.status === AppointmentStatus.SCHEDULED,
  );

  const busy = routePending || createAppt.isPending;
  const atCashier = encounterStatus === "WAITING_PAYMENT";

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
        Cashier & appointment
      </h3>
      {atCashier ? (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          {paymentReturnStation === "LAB"
            ? "Patient is at cashier for lab payment. After pay they go to lab. Results return to your queue when ready."
            : "Patient is at cashier. After payment they return to your queue automatically - no cashier send-back step."}
        </div>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-2">
        {!isFinalized ? (
          <PaymentRequestPanel
            encounterId={encounterId}
            returnStation="DOCTOR"
            disabled={busy || atCashier}
            title="Send to cashier"
          />
        ) : (
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground">Cashier</h3>
            <p className="mt-1 text-xs text-muted">
              Consultation finalized - desk handles remaining balance.
            </p>
          </div>
        )}

        <div className="rounded-lg border border-sky-200 bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">
            Give appointment
          </h3>
          <p className="mt-1 text-xs text-muted">
            Doctor books the follow-up. Front desk will see it on the
            appointment list.
          </p>
          {followUps.length > 0 ? (
            <ul className="mt-3 space-y-1.5 text-sm text-foreground">
              {followUps.map((a) => (
                <li key={a.id}>
                  {format(new Date(a.scheduledAt), "dd MMM yyyy, HH:mm")}
                  {a.notes ? (
                    <span className="text-muted"> - {a.notes}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {!isFinalized ? (
            <div className="mt-3 space-y-3">
              <div>
                <Label className="mb-1 block text-xs">Date & time</Label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs">Notes</Label>
                <Input
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  placeholder="Optional - reason for follow-up"
                  disabled={busy}
                />
              </div>
              <Button
                type="button"
                className="w-full"
                disabled={!scheduledAt || busy}
                onClick={() => {
                  if (!scheduledAt) return;
                  createAppt.mutate(
                    {
                      patientId,
                      scheduledAt: new Date(scheduledAt).toISOString(),
                      departmentId,
                      serviceId: serviceId || undefined,
                      notes: scheduleNotes || undefined,
                    },
                    {
                      onSuccess: () => setScheduleNotes(""),
                    },
                  );
                }}
              >
                {createAppt.isPending ? "Saving…" : "Save appointment"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Finish step - pharmacy send + complete visit. */
function FinishNextSteps({
  consultationId,
  invoiceId,
  encounterStatus,
  paymentReturnStation,
  isFinalized,
  finalizePending,
  routePending,
  onComplete,
  onPharmacy,
}: {
  consultationId?: string;
  invoiceId?: string;
  encounterStatus: string;
  paymentReturnStation?: string | null;
  isFinalized: boolean;
  finalizePending: boolean;
  routePending: boolean;
  onComplete: () => void;
  onPharmacy: () => void;
}) {
  const rxList = usePrescriptions();
  const invoice = useInvoice(invoiceId ?? null, {
    refetchInterval: 8_000,
  });

  const myRx =
    rxList.data?.filter((p) => p.consultationId === consultationId) ?? [];
  const activeRx = myRx.filter((p) =>
    ["ACTIVE", "PARTIAL"].includes(p.status),
  );

  const inv = invoice.data;
  // Due now blocks completion; approved "pay later" debt does not.
  const unpaidCents = invoiceDueNow(inv);
  const hasUnpaid = unpaidCents > 0;
  const payLaterCents = invoicePayLater(inv);
  const waivedCents = inv?.waivedCents ?? 0;
  const busy = finalizePending || routePending;
  const atCashier = encounterStatus === "WAITING_PAYMENT";

  return (
    <div className="space-y-4">
      {atCashier ? (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          {paymentReturnStation === "LAB"
            ? "Patient is at cashier for lab payment. After pay they go to lab. Results return to your queue when ready."
            : "Patient is at cashier. After payment they return to your queue automatically - no cashier send-back step."}
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">Pharmacy</h3>
          <p className="mt-1 text-xs text-muted">
            Dispense prescribed medicines.{" "}
            {activeRx.length === 0
              ? "No active prescription yet - add medicines under Orders first, or still send if needed."
              : `${activeRx.length} prescription ready.`}
          </p>
          {!isFinalized ? (
            <Button
              type="button"
              className="mt-3"
              disabled={busy || atCashier}
              onClick={onPharmacy}
            >
              {routePending ? "Sending…" : "Send to pharmacy"}
            </Button>
          ) : null}
        </div>

        <div className="rounded-lg border-2 border-emerald-500 bg-emerald-50 p-4 shadow-sm">
          <h3 className="text-base font-semibold text-emerald-950">
            Complete consultation
          </h3>
          <p className="mt-1 text-sm text-emerald-900">
            {hasUnpaid
              ? "Collect payment first. You cannot complete while payment is still due at the cashier."
              : payLaterCents > 0
                ? "Cashier approved pay later. You can complete - the balance stays on the patient's account."
                : "Payment settled (or no fee). Completing archives this visit and shows it under Completed today."}
          </p>
          {payLaterCents > 0 || waivedCents > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {payLaterCents > 0 ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-950">
                  Pay later · owes {formatCents(payLaterCents)}
                </span>
              ) : null}
              {waivedCents > 0 ? (
                <span className="rounded-full bg-violet-100 px-2.5 py-1 font-semibold text-violet-800">
                  Waived {formatCents(waivedCents)}
                </span>
              ) : null}
            </div>
          ) : null}
          {hasUnpaid && !isFinalized ? (
            <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              Not paid - due {formatCents(unpaidCents)}. Use{" "}
              <strong>Send to cashier</strong> under Orders, then complete after
              payment.
            </p>
          ) : null}
          {consultationId && !isFinalized ? (
            <Button
              type="button"
              size="lg"
              className="mt-4 w-full bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              disabled={busy || hasUnpaid}
              onClick={onComplete}
            >
              {finalizePending ? "Completing…" : "Complete consultation"}
            </Button>
          ) : null}
          {isFinalized ? (
            <p className="mt-4 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
              Finished and archived → {nextStopLabel(encounterStatus)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
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
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <p className="text-sm text-muted">Save notes first.</p>
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
    <div className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">Medicines</h2>

      {!isFinalized ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted">
            Select medicines - save now, or save and send to pharmacy
          </p>
          {medicines.isLoading ? (
            <LoadingBlock label="Loading medicines" />
          ) : null}
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2 text-sm">
            {medicines.data?.map((m) => (
              <li key={m.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-muted-bg">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={selectedMeds.includes(m.id)}
                    onChange={() => toggleMed(m.id)}
                  />
                  <span>
                    {m.name}
                    <span className="ml-1 text-xs text-muted">{m.code}</span>
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

      <div className="border-t border-border pt-3">
        <p className="mb-2 text-xs font-medium text-muted">
          Prescriptions this visit
        </p>
        {myRx.length === 0 ? (
          <p className="text-sm text-muted">None yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {myRx.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2">
                <span>
                  {p.prescriptionNumber} - {p.status}
                </span>
                <span className="text-xs text-muted">
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

function isLabInvoiceLine(description: string) {
  return /^Lab order /i.test(description);
}

function VisitSideCards({
  consultationId,
  invoiceId,
  encounterStatus,
  paymentReturnStation,
  ultrasoundPlan,
}: {
  consultationId: string;
  invoiceId?: string;
  encounterStatus: string;
  paymentReturnStation?: string | null;
  ultrasoundPlan?: string | null;
}) {
  const labs = useLabOrders();
  const rx = usePrescriptions();
  const atCashier = encounterStatus === "WAITING_PAYMENT";
  const invoice = useInvoice(invoiceId ?? null, {
    refetchInterval: atCashier ? 8_000 : false,
  });

  const labItems =
    labs.data?.filter(
      (o) =>
        o.consultationId === consultationId &&
        o.status !== LabOrderStatus.CANCELLED,
    ) ?? [];
  const rxItems =
    rx.data?.filter((p) => p.consultationId === consultationId) ?? [];
  const inv = invoice.data;
  const lineStates = new Map(
    (inv ? invoiceLineStates(inv) : []).map((l) => [l.id, l.state]),
  );
  const cashierItems =
    inv?.items.filter(
      (item) =>
        !isLabInvoiceLine(item.description) &&
        !isUltrasoundDescription(item.description),
    ) ?? [];
  const ultrasoundItems =
    inv?.items.filter((item) =>
      isUltrasoundDescription(item.description),
    ) ?? [];
  const ultrasoundNotes = ultrasoundPlan?.trim() ?? "";
  const atCashierLab = atCashier && paymentReturnStation === "LAB";

  return (
    <>
      <Panel title="Laboratory">
        {labItems.length === 0 ? (
          <p className="text-xs text-muted">None</p>
        ) : (
          <ul className="space-y-1.5 text-xs">
            {labItems.map((o) => {
              const billedLine = inv?.items.find((item) =>
                item.description.includes(o.orderNumber),
              );
              const waitingPay =
                atCashierLab && o.status === LabOrderStatus.ORDERED;
              const lineState = billedLine
                ? lineStates.get(billedLine.id)
                : undefined;
              const names = uniquePanelLabels(
                o.items.map((i) => i.labTest),
              );
              return (
                <li key={o.id} className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-foreground">
                    {names || o.orderNumber}
                  </span>
                  {waitingPay ? (
                    <StatusBadge label="At cashier" tone="amber" />
                  ) : (
                    <>
                      {lineState ? (
                        <LineStateBadge state={lineState} atCashier={false} />
                      ) : null}
                      {labOrderStatusBadge(o.status)}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
      <Panel title="Ultrasound">
        {ultrasoundItems.length === 0 && !ultrasoundNotes ? (
          <p className="text-xs text-muted">None</p>
        ) : (
          <div className="space-y-2 text-xs">
            {ultrasoundItems.length > 0 ? (
              <ul className="space-y-1.5">
                {ultrasoundItems.map((item) => {
                  const state = lineStates.get(item.id) ?? "DUE";
                  return (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-start justify-between gap-1.5"
                    >
                      <span className="font-medium text-foreground">
                        {item.description}
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        <span className="tabular-nums text-muted">
                          {formatCents(item.totalCents)}
                        </span>
                        <LineStateBadge state={state} atCashier={atCashier} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {ultrasoundNotes ? (
              <p className="whitespace-pre-wrap text-foreground">
                <span className="font-semibold text-foreground">Notes: </span>
                {ultrasoundNotes.length > 120
                  ? `${ultrasoundNotes.slice(0, 120)}…`
                  : ultrasoundNotes}
              </p>
            ) : null}
          </div>
        )}
      </Panel>
      <Panel title="Medicines">
        {rxItems.length === 0 ? (
          <p className="text-xs text-muted">None</p>
        ) : (
          <ul className="text-xs">
            {rxItems.map((p) => (
              <li key={p.id}>
                {p.prescriptionNumber} - {p.status}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Cashier">
        {cashierItems.length === 0 ? (
          <p className="text-xs text-muted">None</p>
        ) : (
          <ul className="space-y-1.5 text-xs">
            {cashierItems.map((item) => {
              const state = lineStates.get(item.id) ?? "DUE";
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-1.5"
                >
                  <span className="text-foreground">
                    {item.description}
                    {item.quantity > 1 ? (
                      <span className="ml-1 text-muted">
                        ×{item.quantity}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <span className="tabular-nums text-muted">
                      {formatCents(item.totalCents)}
                    </span>
                    <LineStateBadge state={state} atCashier={atCashier} />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
