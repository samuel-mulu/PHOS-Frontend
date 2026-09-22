import { api } from "@/lib/api/client";
import type {
  PaginatedPatients,
  Patient,
  PatientWithEncounters,
} from "@/types/patient";
import type { CreatePatientFormValues } from "./schemas";

export type PatientListParams = {
  search?: string;
  page?: number;
  limit?: number;
};

function toCreatePayload(values: CreatePatientFormValues) {
  const { dateOfBirth, email, middleName, ...rest } = values;
  return {
    ...rest,
    middleName: middleName || undefined,
    email: email || undefined,
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : undefined,
  };
}

export async function fetchPatients(params: PatientListParams) {
  const { data } = await api.get<PaginatedPatients>("/patients", { params });
  return data;
}

export async function fetchPatient(id: string) {
  const { data } = await api.get<PatientWithEncounters>(`/patients/${id}`);
  return data;
}

export async function createPatient(values: CreatePatientFormValues) {
  const { data } = await api.post<Patient>("/patients", toCreatePayload(values));
  return data;
}
