import { api } from "@/lib/api/client";
import type { LabOrder } from "@/features/laboratory/api";
import type { Appointment } from "@/features/appointments/api";
import type {
  PaginatedPatients,
  Patient,
  PatientWithEncounters,
} from "@/types/patient";
import type { CreatePatientFormValues } from "./schemas";

export type PatientChartEncounter = {
  id: string;
  startedAt: string;
  type: string;
  status: string;
  service?: { name: string } | null;
  triage?: { chiefComplaint: string | null } | null;
  consultation?: {
    diagnoses: Array<{ label: string; isPrimary: boolean }>;
  } | null;
};

export type PatientChartInvoice = {
  id: string;
  encounterId: string;
  invoiceNumber: string;
  status: string;
  totalCents: number;
  createdAt: string;
  items: Array<{ description: string; amountCents: number }>;
  payments: Array<{ amountCents: number; status: string }>;
};

export type PatientChartPrescription = {
  id: string;
  status: string;
  createdAt: string;
  items: Array<{ medicine: { name: string }; quantity: number }>;
};

export type PatientChart = {
  patient: Patient;
  encounters: PatientChartEncounter[];
  labOrders: LabOrder[];
  prescriptions: PatientChartPrescription[];
  invoices: PatientChartInvoice[];
  appointments: Appointment[];
};

export type PatientListParams = {
  search?: string;
  page?: number;
  limit?: number;
};

function optionalField(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function toCreatePayload(values: CreatePatientFormValues) {
  const { dateOfBirth, ...rest } = values;
  const payload: Record<string, unknown> = {
    firstName: rest.firstName.trim(),
    lastName: rest.lastName.trim(),
    sex: rest.sex,
  };
  const optionalKeys = [
    "middleName",
    "phone",
    "email",
    "address",
    "governmentId",
    "emergencyContactName",
    "emergencyContactPhone",
    "allergies",
  ] as const;
  for (const key of optionalKeys) {
    const v = optionalField(rest[key]);
    if (v !== undefined) payload[key] = v;
  }
  if (dateOfBirth?.trim()) {
    payload.dateOfBirth = new Date(dateOfBirth).toISOString();
  }
  return payload;
}

export async function fetchPatients(params: PatientListParams) {
  const { data } = await api.get<PaginatedPatients>("/patients", { params });
  return data;
}

export async function fetchPatient(id: string) {
  const { data } = await api.get<PatientWithEncounters>(`/patients/${id}`);
  return data;
}

export async function lookupPatientByNumber(patientNumber: string) {
  const { data } = await api.get<Patient>("/patients/lookup", {
    params: { patientNumber },
  });
  return data;
}

export async function fetchPatientChart(id: string) {
  const { data } = await api.get<PatientChart>(`/patients/${id}/chart`);
  return data;
}

export async function createPatient(values: CreatePatientFormValues) {
  const { data } = await api.post<Patient>("/patients", toCreatePayload(values));
  return data;
}
