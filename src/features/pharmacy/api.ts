import { api } from "@/lib/api/client";

export type DispenseItemInput = {
  prescriptionItemId: string;
  quantity: number;
};

export async function dispensePrescription(
  prescriptionId: string,
  items: DispenseItemInput[],
) {
  const { data } = await api.post(
    `/pharmacy/prescriptions/${prescriptionId}/dispense`,
    { items },
  );
  return data;
}
