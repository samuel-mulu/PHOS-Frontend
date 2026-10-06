"use client";

import { useEffect, useState } from "react";
import { PatientSearchList } from "@/components/patients/patient-search-list";
import { PatientNumberScan } from "@/components/patients/patient-number-scan";
import { QueueBoard } from "@/components/queues/queue-board";
import { StartVisitForm } from "@/components/reception/start-visit-form";
import { PatientIdentityBar } from "@/components/shared/patient-identity-bar";
import { Button } from "@/components/ui/button";
import { PatientRegisterForm } from "@/components/patients/patient-register-form";
import { usePatient } from "@/features/patients/hooks";
import type { Encounter } from "@/features/encounters/api";
import type { Patient } from "@/types/patient";
import { QueueStation } from "@/types/encounter";
import { announceClinic } from "@/lib/voice/announce";
import { encounterStatusBadge } from "@/components/shared/status-badge";

export function ReceptionWorkspace({
  embedded,
  initialPatientId,
  onVisitStarted,
  onGoCashier,
  cashierWaiting = 0,
}: {
  embedded?: boolean;
  /** Open start-visit for this patient (e.g. after register handoff). */
  initialPatientId?: string;
  /** After start visit (embedded front desk): jump to billing. */
  onVisitStarted?: (encounter: Encounter) => void;
  onGoCashier?: () => void;
  cashierWaiting?: number;
} = {}) {
  const [selected, setSelected] = useState<Patient | null>(null);
  const [visitOpen, setVisitOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [lastEncounter, setLastEncounter] = useState<Encounter | null>(null);
  const [lastPaid, setLastPaid] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);

  const handoff = usePatient(initialPatientId ?? "");
  const [consumedHandoff, setConsumedHandoff] = useState(false);

  useEffect(() => {
    if (!initialPatientId || !handoff.data || consumedHandoff) return;
    setSelected(handoff.data);
    setVisitOpen(true);
    setJustRegistered(true);
    setConsumedHandoff(true);
    const url = new URL(window.location.href);
    url.searchParams.delete("patientId");
    window.history.replaceState({}, "", url.toString());
  }, [initialPatientId, handoff.data, consumedHandoff]);

  function selectPatient(patient: Patient, fromRegister = false) {
    setSelected(patient);
    setJustRegistered(fromRegister);
    if (fromRegister) {
      setVisitOpen(true);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {!embedded ? (
        <h1 className="text-xl font-semibold text-slate-900">Reception</h1>
      ) : null}

      {lastEncounter ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-teal-900">
            <span>
              Visit <strong>{lastEncounter.encounterNumber}</strong>
              {lastPaid ? " — paid" : " started"}
            </span>
            {encounterStatusBadge(lastEncounter.status)}
          </div>
          <div className="flex flex-wrap gap-2">
            {embedded && onVisitStarted && !lastPaid ? (
              <Button
                type="button"
                size="sm"
                onClick={() => onVisitStarted(lastEncounter)}
              >
                Go to billing
              </Button>
            ) : null}
            {embedded && onGoCashier && cashierWaiting > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-red-200 text-red-900"
                onClick={onGoCashier}
              >
                Cashier ({cashierWaiting})
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {embedded && onGoCashier && cashierWaiting > 0 && !lastEncounter ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-950">
          <span>
            {cashierWaiting} waiting at cashier
          </span>
          <Button
            type="button"
            size="sm"
            className="bg-red-700 hover:bg-red-800"
            onClick={onGoCashier}
          >
            Open cashier
          </Button>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-800">Find patient</h2>
            <Button
              type="button"
              size="sm"
              onClick={() => setRegisterOpen(true)}
            >
              New patient
            </Button>
          </div>
          <PatientNumberScan onFound={(p) => selectPatient(p)} />
          <PatientSearchList
            hideRegisterLink
            onSelectPatient={(p) => selectPatient(p)}
          />
          {selected ? (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <PatientIdentityBar patient={selected} />
              <Button type="button" onClick={() => setVisitOpen(true)}>
                Bill & start visit
              </Button>
            </div>
          ) : null}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <QueueBoard
            station={QueueStation.TRIAGE}
            hrefPrefix="/nurse"
            title="Triage queue"
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
            <h3 className="mb-4 text-lg font-semibold">New patient</h3>
            <PatientRegisterForm
              showCancelLink={false}
              onRegistered={(patient) => {
                setRegisterOpen(false);
                selectPatient(patient, true);
                const name = [patient.firstName, patient.lastName]
                  .filter(Boolean)
                  .join(" ");
                announceClinic(
                  `Patient ${name}, number ${patient.patientNumber}, registered.`,
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
          <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">
              {justRegistered ? "Registered — bill & start" : "Start visit"}
            </h3>
            <StartVisitForm
              patient={selected}
              submitLabel="Start visit"
              onSuccess={({ encounter, paid }) => {
                const p = selected;
                setVisitOpen(false);
                setSelected(null);
                setJustRegistered(false);
                setLastEncounter(encounter);
                setLastPaid(paid);
                if (p) {
                  announceClinic(
                    paid
                      ? `${p.firstName} ${p.lastName}, payment received. Please proceed.`
                      : `${p.firstName} ${p.lastName}, please proceed.`,
                  );
                }
                // Already paid in dialog — no need to jump to Billing
                if (embedded && onVisitStarted && !paid) {
                  onVisitStarted(encounter);
                }
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
