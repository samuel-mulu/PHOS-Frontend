"use client";

import { useRouter } from "next/navigation";
import { PatientRegisterForm } from "@/components/patients/patient-register-form";

export default function NewPatientPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Register patient</h1>
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <PatientRegisterForm
          onRegistered={(patient) => {
            router.push(
              `/front-desk?tab=reception&patientId=${patient.id}`,
            );
          }}
        />
      </div>
    </div>
  );
}
