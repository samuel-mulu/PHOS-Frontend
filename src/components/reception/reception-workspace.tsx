"use client";

import { useState } from "react";
import { PatientSearchList } from "@/components/patients/patient-search-list";
import { PatientNumberScan } from "@/components/patients/patient-number-scan";
import { QueueBoard } from "@/components/queues/queue-board";
import { StartVisitForm } from "@/components/reception/start-visit-form";
import { PatientIdentityBar } from "@/components/shared/patient-identity-bar";
import { Button } from "@/components/ui/button";
import { PatientRegisterForm } from "@/components/patients/patient-register-form";
import type { Encounter } from "@/features/encounters/api";
import type { Patient } from "@/types/patient";
import { QueueStation } from "@/types/encounter";
import { SimpleDialog } from "@/components/shared/simple-dialog";
import { announceClinic } from "@/lib/voice/announce";
import { encounterStatusBadge } from "@/components/shared/status-badge";

export function ReceptionWorkspace({
  embedded,
  onVisitStarted,
}: {
  embedded?: boolean;
  /** After start visit (embedded front desk): e.g. jump to billing. */
  onVisitStarted?: (encounter: Encounter) => void;
} = {}) {
  const [selected, setSelected] = useState<Patient | null>(null);
  const [visitOpen, setVisitOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [lastEncounter, setLastEncounter] = useState<Encounter | null>(null);
  const [registerDialogPatient, setRegisterDialogPatient] = useState<Patient | null>(
    null,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {!embedded ? (
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Reception</h1>
          <p className="text-sm text-slate-600">
            Register visits and monitor the triage queue.
          </p>
        </div>
      ) : null}
      {lastEncounter ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
          <span>
            Visit <strong>{lastEncounter.encounterNumber}</strong> started — on triage
            queue.
          </span>
          {encounterStatusBadge(lastEncounter.status)}
          {embedded && onVisitStarted ? (
            <button
              type="button"
              className="font-medium underline"
              onClick={() => onVisitStarted(lastEncounter)}
            >
              Bill consultation fee
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-800">Find patient</h2>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setRegisterOpen(true)}
            >
              Register new patient
            </Button>
          </div>
          <PatientNumberScan onFound={setSelected} />
          <PatientSearchList onSelectPatient={setSelected} />
          {selected ? (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <PatientIdentityBar patient={selected} />
              <Button type="button" onClick={() => setVisitOpen(true)}>
                Start new visit
              </Button>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Search and click Select on a patient to start a visit.
            </p>
          )}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <QueueBoard
            station={QueueStation.TRIAGE}
            hrefPrefix="/nurse"
            title="Triage queue (incoming visits)"
          />
        </div>
      </div>
      {registerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => setRegisterOpen(false)}
          />
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Register patient</h3>
            <PatientRegisterForm
              showCancelLink={false}
              onRegistered={(patient) => {
                setRegisterOpen(false);
                setSelected(patient);
                setVisitOpen(true);
                setRegisterDialogPatient(patient);
                const name = [patient.firstName, patient.lastName]
                  .filter(Boolean)
                  .join(" ");
                announceClinic(
                  `Patient ${name}, number ${patient.patientNumber}, registered successfully.`,
                );
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => setRegisterOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      {visitOpen && selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => setVisitOpen(false)}
          />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Start visit</h3>
            <p className="mb-3 text-sm text-slate-600">
              Patient is registered. Confirm service to send them to the triage
              queue.
            </p>
            <StartVisitForm
              patient={selected}
              onSuccess={(encounter) => {
                const p = selected;
                setVisitOpen(false);
                setSelected(null);
                setLastEncounter(encounter);
                if (p) {
                  announceClinic(
                    `${p.firstName} ${p.lastName}, please proceed to triage.`,
                  );
                }
                if (embedded && onVisitStarted) {
                  onVisitStarted(encounter);
                }
              }}
            />
          </div>
        </div>
      ) : null}

      <SimpleDialog
        open={registerDialogPatient != null}
        title="Patient registered"
        primaryLabel="Start visit"
        onPrimary={() => setRegisterDialogPatient(null)}
        onClose={() => setRegisterDialogPatient(null)}
      >
        {registerDialogPatient ? (
          <p>
            <strong>
              {registerDialogPatient.firstName} {registerDialogPatient.lastName}
            </strong>{" "}
            ({registerDialogPatient.patientNumber}) is in the system. Confirm the visit
            dialog to send them to triage, then bill from the Billing tab.
          </p>
        ) : null}
      </SimpleDialog>
    </div>
  );
}
