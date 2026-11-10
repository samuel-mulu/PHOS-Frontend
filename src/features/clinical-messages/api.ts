import { api } from "@/lib/api/client";
import type { ClinicalMessage, ClinicalMessageKind } from "./types";

export async function fetchEncounterClinicalMessages(encounterId: string) {
  const { data } = await api.get<ClinicalMessage[]>(
    `/encounters/${encounterId}/clinical-messages`,
  );
  return data;
}

export async function fetchPatientClinicalMessages(patientId: string) {
  const { data } = await api.get<ClinicalMessage[]>(
    `/patients/${patientId}/clinical-messages`,
  );
  return data;
}

export async function createClinicalMessage(
  encounterId: string,
  payload: {
    body: string;
    kind?: ClinicalMessageKind;
    labOrderId?: string;
  },
) {
  const { data } = await api.post<ClinicalMessage>(
    `/encounters/${encounterId}/clinical-messages`,
    payload,
  );
  return data;
}
