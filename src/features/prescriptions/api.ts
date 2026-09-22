import { api } from "@/lib/api/client";

export type Medicine = {
  id: string;
  code: string;
  name: string;
  strength: string | null;
  form: string | null;
  sellingPriceCents: number;
};

export type PrescriptionItem = {
  id: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string;
  quantity: number;
  dispensedQuantity: number;
  instructions: string | null;
  medicine: Medicine;
};

export type Prescription = {
  id: string;
  prescriptionNumber: string;
  consultationId: string;
  encounterId: string;
  status: string;
  createdAt: string;
  notes: string | null;
  patient?: {
    id: string;
    patientNumber: string;
    firstName: string;
    lastName: string;
  };
  doctor?: { id: string; firstName: string; lastName: string };
  items: PrescriptionItem[];
};

export async function fetchMedicines() {
  const { data } = await api.get<Medicine[]>("/inventory/medicines");
  return data;
}

export async function fetchPrescriptions(status?: string) {
  const { data } = await api.get<Prescription[]>("/prescriptions", {
    params: status ? { status } : undefined,
  });
  return data;
}

export async function fetchPrescription(id: string) {
  const { data } = await api.get<Prescription>(`/prescriptions/${id}`);
  return data;
}

export async function createPrescription(
  consultationId: string,
  body: {
    notes?: string;
    items: Array<{
      medicineId: string;
      dose: string;
      route: string;
      frequency: string;
      duration: string;
      quantity: number;
      instructions?: string;
    }>;
  },
) {
  const { data } = await api.post<Prescription>(
    `/consultations/${consultationId}/prescriptions`,
    body,
  );
  return data;
}
