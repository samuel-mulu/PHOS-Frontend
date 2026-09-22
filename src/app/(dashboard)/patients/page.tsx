import { PatientSearchList } from "@/components/patients/patient-search-list";

export default function PatientsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Patients</h1>
        <p className="text-sm text-slate-600">
          Search by patient number, name, phone, or ID.
        </p>
      </div>
      <PatientSearchList />
    </div>
  );
}
