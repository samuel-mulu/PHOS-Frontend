import { PrescriptionDispense } from "@/components/pharmacy/prescription-dispense";

export default async function PharmacyPrescriptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PrescriptionDispense prescriptionId={id} />;
}
