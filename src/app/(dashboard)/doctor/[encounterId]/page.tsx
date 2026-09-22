import { DoctorConsultationWorkspace } from "@/components/doctor/doctor-consultation-workspace";

export default async function DoctorEncounterPage({
  params,
}: {
  params: Promise<{ encounterId: string }>;
}) {
  const { encounterId } = await params;
  return <DoctorConsultationWorkspace encounterId={encounterId} />;
}
