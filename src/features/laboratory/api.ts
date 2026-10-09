import { api } from "@/lib/api/client";
import type { EncounterPriority } from "@/types/encounter";
import type { LabOrderStatus, LabResultFlag } from "@/types/lab";
import type { Patient } from "@/types/patient";

export type LabTest = {
  id: string;
  code: string;
  name: string;
  category: string | null;
  unit: string | null;
  referenceRange: string | null;
  priceCents: number;
  sortOrder: number;
  active: boolean;
};

export type LabResult = {
  id: string;
  value: string;
  unit: string | null;
  referenceRange: string | null;
  flag: LabResultFlag | null;
  notes: string | null;
  verifiedAt: string | null;
};

export type LabOrderItem = {
  id: string;
  labOrderId: string;
  labTestId: string;
  priceCents: number;
  labTest: LabTest;
  result?: LabResult | null;
};

export type LabOrder = {
  id: string;
  orderNumber: string;
  consultationId: string;
  encounterId: string;
  status: LabOrderStatus;
  priority: EncounterPriority;
  clinicalNotes: string | null;
  createdAt: string;
  patient: Patient;
  doctor?: { id: string; firstName: string; lastName: string };
  items: LabOrderItem[];
};

export type ResultValueInput = {
  labOrderItemId: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  flag?: LabResultFlag;
  notes?: string;
};

export async function fetchLabTests() {
  const { data } = await api.get<LabTest[]>("/lab/tests");
  return data;
}

export async function fetchAdminLabTests() {
  const { data } = await api.get<LabTest[]>("/lab/tests/admin");
  return data;
}

export async function createLabTest(body: {
  code: string;
  name: string;
  category?: string;
  unit?: string;
  referenceRange?: string;
  priceCents: number;
  sortOrder?: number;
  active?: boolean;
}) {
  const { data } = await api.post<LabTest>("/lab/tests", body);
  return data;
}

export async function updateLabTest(
  id: string,
  body: {
    name?: string;
    category?: string;
    unit?: string;
    referenceRange?: string;
    priceCents?: number;
    sortOrder?: number;
    active?: boolean;
  },
) {
  const { data } = await api.patch<LabTest>(`/lab/tests/${id}`, body);
  return data;
}

export async function setLabTestActive(id: string, active: boolean) {
  const { data } = await api.patch<LabTest>(`/lab/tests/${id}/status`, {
    active,
  });
  return data;
}

export async function fetchLabOrders(status?: LabOrderStatus) {
  const { data } = await api.get<LabOrder[]>("/lab/orders", {
    params: status ? { status } : undefined,
  });
  return data;
}

export async function fetchLabOrder(id: string) {
  const { data } = await api.get<LabOrder>(`/lab/orders/${id}`);
  return data;
}

export async function receiveLabOrder(id: string) {
  const { data } = await api.post<LabOrder>(`/lab/orders/${id}/receive`);
  return data;
}

export async function enterLabResults(id: string, results: ResultValueInput[]) {
  const { data } = await api.post<LabOrder>(`/lab/orders/${id}/results`, {
    results,
  });
  return data;
}

export async function verifyLabOrder(id: string) {
  const { data } = await api.post<LabOrder>(`/lab/orders/${id}/verify`);
  return data;
}

export async function createLabOrder(
  consultationId: string,
  body: {
    labTestIds: string[];
    priority?: EncounterPriority;
    clinicalNotes?: string;
  },
) {
  const { data } = await api.post<LabOrder>(
    `/consultations/${consultationId}/lab-orders`,
    body,
  );
  return data;
}
