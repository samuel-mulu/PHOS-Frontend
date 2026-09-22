import { TriageForm } from "@/components/nurse/triage-form";

export default async function NurseEncounterPage({
  params,
}: {
  params: Promise<{ encounterId: string }>;
}) {
  const { encounterId } = await params;
  return <TriageForm encounterId={encounterId} />;
}
