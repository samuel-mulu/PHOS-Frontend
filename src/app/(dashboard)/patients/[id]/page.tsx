import { PatientProfile } from "@/components/patients/patient-profile";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-4xl">
      <PatientProfile patientId={id} />
    </div>
  );
}
