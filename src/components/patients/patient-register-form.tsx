"use client";

import { PatientForm } from "@/components/patients/patient-form";
import type { Patient } from "@/types/patient";

export function PatientRegisterForm({
  onRegistered,
  showCancelLink = true,
}: {
  /** When set, skips redirect to profile (use with front desk start-visit flow). */
  onRegistered?: (patient: Patient) => void;
  showCancelLink?: boolean;
}) {
  return (
    <PatientForm
      onSuccess={onRegistered}
      showCancelLink={showCancelLink}
    />
  );
}
