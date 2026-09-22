import { isAxiosError } from "axios";
import { api } from "@/lib/api/client";
import type { ConsultationFormValues, DiagnosisFormValues } from "./schemas";

export type Consultation = {
  id: string;
  encounterId: string;
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
  encounter?: {
    patient: {
      id: string;
      patientNumber: string;
      firstName: string;
      lastName: string;
      sex: string;
      dateOfBirth: string | null;
      allergies: string | null;
    };
    triage: Record<string, unknown> | null;
  };
};

export async function fetchConsultationByEncounter(encounterId: string) {
  try {
    const { data } = await api.get<Consultation>(
      `/encounters/${encounterId}/consultation`,
    );
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

export async function saveConsultation(
  encounterId: string,
  dto: ConsultationFormValues,
) {
  const { data } = await api.post<Consultation>(
    `/encounters/${encounterId}/consultation`,
    dto,
  );
  return data;
}

export async function addDiagnosis(
  consultationId: string,
  dto: DiagnosisFormValues,
) {
  const { data } = await api.post(`/consultations/${consultationId}/diagnoses`, dto);
  return data;
}

export async function finalizeConsultation(consultationId: string) {
  const { data } = await api.post(`/consultations/${consultationId}/finalize`);
  return data;
}
