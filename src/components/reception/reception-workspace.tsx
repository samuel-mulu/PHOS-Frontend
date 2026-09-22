"use client";

import { useState } from "react";
import { PatientSearchList } from "@/components/patients/patient-search-list";
import { QueueBoard } from "@/components/queues/queue-board";
import { StartVisitForm } from "@/components/reception/start-visit-form";
import { PatientIdentityBar } from "@/components/shared/patient-identity-bar";
import { Button } from "@/components/ui/button";
import type { Patient } from "@/types/patient";
import { QueueStation } from "@/types/encounter";

export function ReceptionWorkspace() {
  const [selected, setSelected] = useState<Patient | null>(null);
  const [visitOpen, setVisitOpen] = useState(false);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Reception</h1>
        <p className="text-sm text-slate-600">
          Register visits and monitor the triage queue.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Find patient</h2>
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
            <StartVisitForm
              patient={selected}
              onSuccess={() => {
                setVisitOpen(false);
                setSelected(null);
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
