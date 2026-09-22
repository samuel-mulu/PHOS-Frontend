import { PatientRegisterForm } from "@/components/patients/patient-register-form";

export default function NewPatientPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Register patient</h1>
        <p className="text-sm text-slate-600">
          Fields match the backend registration contract. Duplicates are flagged
          before creation.
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <PatientRegisterForm />
      </div>
    </div>
  );
}
