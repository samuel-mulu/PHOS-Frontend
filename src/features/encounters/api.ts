import { api } from "@/lib/api/client";
import type { EncounterPriority, EncounterType } from "@/types/encounter";
import type { Patient } from "@/types/patient";

export type Encounter = {
  id: string;
  encounterNumber: string;
  patientId: string;
  facilityId: string;
  departmentId: string;
  serviceId: string | null;
  status: string;
  type: EncounterType;
  priority: EncounterPriority;
  reason: string | null;
  startedAt: string;
  assignedDoctorId?: string | null;
  /** After mid-visit payment, patient returns to this station. */
  paymentReturnStation?: "TRIAGE" | "DOCTOR" | "LAB" | "PHARMACY" | "CASHIER" | null;
  assignedDoctor?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  patient?: Patient;
  service?: { id: string; name: string; code: string };
  department?: { id: string; name: string; code: string };
};

export type EncounterDetail = Encounter & {
  invoice?: { id: string; invoiceNumber: string; status: string } | null;
  patient: Patient;
  queueEntries: Array<{
    id: string;
    station: string;
    status: string;
    enteredAt: string;
  }>;
  triage: Record<string, unknown> | null;
  consultation: {
    id: string;
    status: string;
    chiefComplaint: string | null;
    historyPresentIllness: string | null;
    physicalExam: string | null;
    assessment: string | null;
    plan: string | null;
    notes: string | null;
    diagnoses: Array<{
      id: string;
      label: string;
      code: string | null;
      type: string;
      isPrimary: boolean;
    }>;
  } | null;
};

export type CreateEncounterInput = {
  patientId: string;
  facilityId: string;
  departmentId: string;
  /** Optional — visit may start with no fee. */
  serviceId?: string;
  type?: EncounterType;
  priority?: EncounterPriority;
  reason?: string;
  /** TRIAGE or DOCTOR — defaults to DOCTOR on the server. */
  initialStation?: "TRIAGE" | "DOCTOR";
  /** Optional doctor assignment by user id. */
  assignedDoctorId?: string;
};

export async function createEncounter(input: CreateEncounterInput) {
  const { data } = await api.post<Encounter>("/encounters", input);
  return data;
}

export async function fetchEncounter(id: string) {
  const { data } = await api.get<EncounterDetail>(`/encounters/${id}`);
  return data;
}

export async function fetchEncounters(params?: {
  status?: string;
  patientId?: string;
}) {
  const { data } = await api.get<Encounter[]>("/encounters", { params });
  return data;
}

export async function requestBilling(encounterId: string) {
  const { data } = await api.post<{ success: boolean; encounterId: string }>(
    `/encounters/${encounterId}/billing-request`,
  );
  return data;
}

export type PaymentRequestInput = {
  description: string;
  amountCents: number;
  returnStation: "DOCTOR" | "LAB" | "PHARMACY" | "TRIAGE";
};

export async function requestPayment(
  encounterId: string,
  input: PaymentRequestInput,
) {
  const { data } = await api.post<{
    success: boolean;
    encounterId: string;
    invoiceId: string;
    returnStation: "DOCTOR" | "LAB" | "PHARMACY" | "TRIAGE";
  }>(`/encounters/${encounterId}/payment-request`, input);
  return data;
}

export async function routeEncounter(
  encounterId: string,
  station: "TRIAGE" | "DOCTOR" | "LAB" | "PHARMACY" | "CASHIER",
) {
  const { data } = await api.post<EncounterDetail>(
    `/encounters/${encounterId}/route`,
    { station },
  );
  return data;
}
