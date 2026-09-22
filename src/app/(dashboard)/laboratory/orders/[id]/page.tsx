import { LabOrderDetail } from "@/components/laboratory/lab-order-detail";

export default async function LabOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LabOrderDetail orderId={id} />;
}
