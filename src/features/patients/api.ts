import { api } from "@/lib/api/client";
import type { LabOrder } from "@/features/laboratory/api";
import type { Appointment } from "@/features/appointments/api";
import type {
  PaginatedPatients,
  Patient,
  PatientWithEncounters,
} from "@/types/patient";
import type { CreatePatientFormValues } from "./schemas";

export type PatientChartPerson = {
  id: string;
  firstName: string;
  lastName: string;
};

export type PatientChartEncounter = {
  id: string;
  encounterNumber?: string;
  startedAt: string;
  closedAt?: string | null;
  type: string;
  status: string;
  reason?: string | null;
  priority?: string;
  service?: { id?: string; name: string; code?: string } | null;
  department?: { id?: string; name: string } | null;
  assignedDoctor?: PatientChartPerson | null;
  triage?: {
    temperature?: number | null;
    systolic?: number | null;
    diastolic?: number | null;
    heartRate?: number | null;
    spo2?: number | null;
    bloodGlucoseMgDl?: number | null;
    notes?: string | null;
  } | null;
  consultation?: {
    id?: string;
    status?: string;
    chiefComplaint?: string | null;
    historyPresentIllness?: string | null;
    physicalExam?: string | null;
    assessment?: string | null;
    plan?: string | null;
    notes?: string | null;
    finalizedAt?: string | null;
    doctor?: PatientChartPerson | null;
    diagnoses: Array<{
      id?: string;
      label: string;
      code?: string | null;
      type?: string;
      isPrimary: boolean;
    }>;
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
  encounterId?: string;
  prescriptionNumber?: string;
  status: string;
  createdAt: string;
  notes?: string | null;
  doctor?: PatientChartPerson | null;
  items: Array<{
    dose?: string;
    route?: string;
    frequency?: string;
    duration?: string;
    quantity: number;
    instructions?: string | null;
    medicine: {
      name: string;
      code?: string;
      strength?: string | null;
      form?: string | null;
    };
  }>;
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
