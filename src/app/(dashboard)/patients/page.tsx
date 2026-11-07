import { PatientSearchList } from "@/components/patients/patient-search-list";

export default function PatientsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-xl font-semibold text-foreground">Patients</h1>
      <PatientSearchList />
    </div>
  );
}
