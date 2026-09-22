import { api } from "@/lib/api/client";
import type { EncounterPriority, EncounterType } from "@/types/encounter";
import type { Patient } from "@/types/patient";

export type Encounter = {
  id: string;
  encounterNumber: string;
  patientId: string;
  facilityId: string;
  departmentId: string;
  serviceId: string;
  status: string;
  type: EncounterType;
  priority: EncounterPriority;
  reason: string | null;
  startedAt: string;
  patient?: Patient;
  service?: { id: string; name: string; code: string };
  department?: { id: string; name: string; code: string };
};

export type EncounterDetail = Encounter & {
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
  serviceId: string;
  type?: EncounterType;
  priority?: EncounterPriority;
  reason?: string;
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
