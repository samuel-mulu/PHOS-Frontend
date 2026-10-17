"use client";

import { Button } from "@/components/ui/button";
import { OverlayPortal } from "@/components/shared/overlay-portal";
import { PatientForm } from "@/components/patients/patient-form";
import type { Patient } from "@/types/patient";

export function PatientEditDialog({
  patient,
  open,
  onClose,
  onUpdated,
}: {
  patient: Patient | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: (patient: Patient) => void;
}) {
  if (!open || !patient) return null;

  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-[80] flex items-stretch justify-center p-2 sm:p-4">
        <button
          type="button"
          className="absolute inset-0 bg-black/40"
          aria-label="Close"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-patient-dialog-title"
          className="relative flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
            <div>
              <h3
                id="edit-patient-dialog-title"
                className="text-lg font-semibold text-slate-900"
              >
                Edit patient
              </h3>
              <p className="text-xs text-slate-500">{patient.patientNumber}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <PatientForm
              key={patient.id}
              patient={patient}
              showCancelLink={false}
              onCancel={onClose}
              onSuccess={(updated) => {
                onUpdated?.(updated);
                onClose();
              }}
            />
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}
