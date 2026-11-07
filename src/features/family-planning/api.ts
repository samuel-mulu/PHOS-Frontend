import { api } from "@/lib/api/client";
import type { FamilyPlanningFormValues } from "./schemas";
import type { FamilyPlanningRecord } from "./types";

function num(value?: string) {
  if (value === undefined || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function int(value?: string) {
  const n = num(value);
  return n === undefined ? undefined : Math.trunc(n);
}

function dateOnly(value?: string) {
  if (!value?.trim()) return undefined;
  return value.trim().slice(0, 10);
}

export function familyPlanningToPayload(values: FamilyPlanningFormValues) {
  const out: Record<string, unknown> = {};
  if (values.visitType) out.visitType = values.visitType;
  const gravidity = int(values.gravidity);
  const parity = int(values.parity);
  const livingChildren = int(values.livingChildren);
  if (gravidity !== undefined) out.gravidity = gravidity;
  if (parity !== undefined) out.parity = parity;
  if (livingChildren !== undefined) out.livingChildren = livingChildren;
  if (values.previousMethod) out.previousMethod = values.previousMethod;
  if (values.currentMethod) out.currentMethod = values.currentMethod;
  if (values.pregnancyStatus?.trim())
    out.pregnancyStatus = values.pregnancyStatus.trim();
  const systolic = int(values.systolic);
  const diastolic = int(values.diastolic);
  if (systolic !== undefined) out.systolic = systolic;
  if (diastolic !== undefined) out.diastolic = diastolic;
  if (values.contraindications?.trim())
    out.contraindications = values.contraindications.trim();
  if (values.counselingDone === true || values.counselingDone === false) {
    out.counselingDone = values.counselingDone;
  }
  if (values.counselingNotes?.trim())
    out.counselingNotes = values.counselingNotes.trim();
  const procedureDate = dateOnly(values.procedureDate);
  if (procedureDate) out.procedureDate = procedureDate;
  if (values.sideEffects?.trim()) out.sideEffects = values.sideEffects.trim();
  const nextAppointment = dateOnly(values.nextAppointment);
  if (nextAppointment) out.nextAppointment = nextAppointment;
  if (values.outcome) out.outcome = values.outcome;
  if (values.encounterId?.trim()) out.encounterId = values.encounterId.trim();
  return out;
}

export async function fetchFamilyPlanning(patientId: string) {
  const { data } = await api.get<FamilyPlanningRecord[]>(
    `/patients/${patientId}/family-planning`,
  );
  return data;
}

export async function createFamilyPlanning(
  patientId: string,
  values: FamilyPlanningFormValues,
) {
  const { data } = await api.post<FamilyPlanningRecord>(
    `/patients/${patientId}/family-planning`,
    familyPlanningToPayload(values),
  );
  return data;
}

export async function updateFamilyPlanning(
  id: string,
  values: FamilyPlanningFormValues,
) {
  const { data } = await api.put<FamilyPlanningRecord>(
    `/family-planning/${id}`,
    familyPlanningToPayload(values),
  );
  return data;
}
