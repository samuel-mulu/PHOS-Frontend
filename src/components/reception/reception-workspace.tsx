"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PatientSearchList } from "@/components/patients/patient-search-list";
import { QueueBoard } from "@/components/queues/queue-board";
import {
  DeskDoctorQueueTable,
  useOpenVisitCount,
} from "@/components/front-desk/desk-doctor-queue-table";
import {
  StartVisitForm,
  type VisitKind,
} from "@/components/reception/start-visit-form";
import { PatientIdentityBar } from "@/components/shared/patient-identity-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PatientRegisterForm } from "@/components/patients/patient-register-form";
import { usePatient } from "@/features/patients/hooks";
import { useCreateAppointment } from "@/features/appointments/hooks";
import { useQueue } from "@/features/queues/hooks";
import type { Encounter } from "@/features/encounters/api";
import type { Patient } from "@/types/patient";
import { QueueStation } from "@/types/encounter";
import { OverlayPortal } from "@/components/shared/overlay-portal";
import {
  announceClinic,
  buildProceedMessage,
  buildRegisteredMessage,
} from "@/lib/voice/announce";
import { cn } from "@/lib/utils";

type ReceptionSubTab = "find" | "triage" | "doctors";

export function ReceptionWorkspace({
  embedded,
  initialPatientId,
  onVisitStarted,
}: {
  embedded?: boolean;
  /** Open start-visit for this patient (e.g. after register handoff). */
  initialPatientId?: string;
  /** After unpaid start visit (embedded front desk): jump to billing. */
  onVisitStarted?: (encounter: Encounter) => void;
} = {}) {
  const [subTab, setSubTab] = useState<ReceptionSubTab>("find");
  const [selected, setSelected] = useState<Patient | null>(null);
  const [visitKind, setVisitKind] = useState<VisitKind>("RETURNING");
  const [visitOpen, setVisitOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [schedulePatient, setSchedulePatient] = useState<Patient | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("");

  const createAppt = useCreateAppointment();
  const triageQueue = useQueue(QueueStation.TRIAGE, 8_000);
  const triageWaiting = triageQueue.data?.length ?? 0;
  const doctorQueueCount = useOpenVisitCount();

  const handoff = usePatient(initialPatientId ?? "");
  const [consumedHandoff, setConsumedHandoff] = useState(false);

  function openVisit(patient: Patient, kind: VisitKind) {
    setSelected(patient);
    setVisitKind(kind);
    setVisitOpen(true);
  }

  function closeVisit() {
    setVisitOpen(false);
    setSelected(null);
  }

  function closeSchedule() {
    setSchedulePatient(null);
    setScheduledAt("");
    setScheduleNotes("");
  }

  useEffect(() => {
    if (!initialPatientId || !handoff.data || consumedHandoff) return;
    setSelected(handoff.data);
    setVisitKind("NEW");
    setVisitOpen(true);
    setSubTab("find");
    setConsumedHandoff(true);
    const url = new URL(window.location.href);
    url.searchParams.delete("patientId");
    window.history.replaceState({}, "", url.toString());
  }, [initialPatientId, handoff.data, consumedHandoff]);

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      {!embedded ? (
        <h1 className="text-xl font-semibold text-foreground">Reception</h1>
      ) : null}

      <nav
        className="sticky top-0 z-10 flex flex-wrap gap-2 border-b border-border bg-muted-bg pb-2"
        aria-label="Reception views"
      >
        <button
          type="button"
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium",
            subTab === "find"
              ? "bg-teal-700 text-white shadow-sm dark:bg-primary"
              : "bg-slate-100 text-slate-800 ring-1 ring-slate-200 hover:bg-slate-200 dark:bg-muted-bg dark:text-foreground dark:ring-border dark:hover:bg-hover-strong",
          )}
          onClick={() => setSubTab("find")}
        >
          Find returning patient
        </button>
        <button
          type="button"
          className={cn(
            "inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium",
            subTab === "triage"
              ? "bg-teal-700 text-white shadow-sm dark:bg-primary"
              : "bg-slate-100 text-slate-800 ring-1 ring-slate-200 hover:bg-slate-200 dark:bg-muted-bg dark:text-foreground dark:ring-border dark:hover:bg-hover-strong",
          )}
          onClick={() => setSubTab("triage")}
        >
          Triage queue
          {triageWaiting > 0 ? (
            <span
              className={cn(
                "ml-1.5 inline-flex min-w-[1.15rem] items-center justify-center rounded-full px-1.5 py-0.5 text-3xs font-bold",
                subTab === "triage"
                  ? "bg-white/25 text-white"
                  : "bg-red-600 text-white",
              )}
            >
              {triageWaiting}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          className={cn(
            "inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium",
            subTab === "doctors"
              ? "bg-teal-700 text-white shadow-sm dark:bg-primary"
              : "bg-slate-100 text-slate-800 ring-1 ring-slate-200 hover:bg-slate-200 dark:bg-muted-bg dark:text-foreground dark:ring-border dark:hover:bg-hover-strong",
          )}
          onClick={() => setSubTab("doctors")}
        >
          Doctor queue
          {doctorQueueCount > 0 ? (
            <span
              className={cn(
                "ml-1.5 inline-flex min-w-[1.15rem] items-center justify-center rounded-full px-1.5 py-0.5 text-3xs font-bold",
                subTab === "doctors"
                  ? "bg-white/25 text-white"
                  : "bg-teal-800 text-white",
              )}
            >
              {doctorQueueCount}
            </span>
          ) : null}
        </button>
      </nav>

      {subTab === "find" ? (
        <PatientSearchList
          hideRegisterLink
          maximize
          expandable
          title="Find returning patient"
          headerAction={
            <Button
              type="button"
              size="sm"
              onClick={() => setRegisterOpen(true)}
            >
              New patient
            </Button>
          }
          onSelectPatient={(p) => openVisit(p, "RETURNING")}
          onScheduleAppointment={(p) => {
            setSchedulePatient(p);
            setScheduledAt("");
            setScheduleNotes("");
          }}
        />
      ) : null}

      {subTab === "triage" ? (
        <QueueBoard
          station={QueueStation.TRIAGE}
          hrefPrefix="/nurse"
          title="Triage queue"
          expandable
        />
      ) : null}

      {subTab === "doctors" ? <DeskDoctorQueueTable /> : null}

      {registerOpen ? (
        <OverlayPortal>
          <div className="fixed inset-0 z-[80] flex items-stretch justify-center p-2 sm:p-4">
            <button
              type="button"
              className="absolute inset-0 bg-black/55"
              aria-label="Close"
              onClick={() => setRegisterOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="new-patient-dialog-title"
              className="relative flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-border bg-card text-foreground shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <h3
                  id="new-patient-dialog-title"
                  className="text-lg font-semibold"
                >
                  New patient
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRegisterOpen(false)}
                >
                  Close
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <PatientRegisterForm
                  showCancelLink={false}
                  onRegistered={(patient) => {
                    setRegisterOpen(false);
                    openVisit(patient, "NEW");
                    announceClinic(
                      buildRegisteredMessage(
                        patient.firstName,
                        patient.lastName,
                        patient.patientNumber,
                      ),
                    );
                  }}
                />
              </div>
            </div>
          </div>
        </OverlayPortal>
      ) : null}

      {schedulePatient ? (
        <OverlayPortal>
          <div className="fixed inset-0 z-[80] flex items-stretch justify-center p-2 sm:p-4">
            <button
              type="button"
              className="absolute inset-0 bg-black/55"
              aria-label="Close"
              onClick={closeSchedule}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="schedule-appt-title"
              className="relative flex max-h-[96vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-border bg-card text-foreground shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <h3
                  id="schedule-appt-title"
                  className="text-lg font-semibold text-foreground"
                >
                  Add appointment
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={closeSchedule}
                >
                  Close
                </Button>
              </div>
              <div className="space-y-4 overflow-y-auto p-5">
                <PatientIdentityBar patient={schedulePatient} />
                <div>
                  <Label className="mb-1 block text-xs">Date & time</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs">Notes</Label>
                  <Input
                    value={scheduleNotes}
                    onChange={(e) => setScheduleNotes(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <Button
                  type="button"
                  className="w-full"
                  disabled={!scheduledAt || createAppt.isPending}
                  onClick={() => {
                    if (!schedulePatient || !scheduledAt) return;
                    createAppt.mutate(
                      {
                        patientId: schedulePatient.id,
                        scheduledAt: new Date(scheduledAt).toISOString(),
                        notes: scheduleNotes || undefined,
                      },
                      { onSuccess: () => closeSchedule() },
                    );
                  }}
                >
                  {createAppt.isPending ? "Saving…" : "Save appointment"}
                </Button>
              </div>
            </div>
          </div>
        </OverlayPortal>
      ) : null}

      {visitOpen && selected ? (
        <OverlayPortal>
          <div className="fixed inset-0 z-[80] flex items-stretch justify-center p-2 sm:p-4">
            <button
              type="button"
              className="absolute inset-0 bg-black/55"
              aria-label="Close"
              onClick={closeVisit}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="start-visit-dialog-title"
              className="relative flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-border bg-card text-foreground shadow-xl"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-5 py-3">
                <h3
                  id="start-visit-dialog-title"
                  className="text-lg font-semibold text-foreground"
                >
                  {visitKind === "NEW"
                    ? "New patient - bill & start"
                    : "Returning patient - bill & start"}
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={closeVisit}
                >
                  Close
                </Button>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <PatientIdentityBar patient={selected} />
                <StartVisitForm
                  patient={selected}
                  visitKind={visitKind}
                  submitLabel="Start visit"
                  onSuccess={({ encounter, paid }) => {
                    const p = selected;
                    closeVisit();
                    if (p) {
                      announceClinic(
                        buildProceedMessage(p.firstName, p.lastName, paid),
                      );
                    }
                    if (paid) {
                      toast.success("Visit started and paid");
                    } else if (embedded && onVisitStarted) {
                      onVisitStarted(encounter);
                    } else {
                      toast.success("Visit started");
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </OverlayPortal>
      ) : null}
    </div>
  );
}
