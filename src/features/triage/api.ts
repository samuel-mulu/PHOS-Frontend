import { api } from "@/lib/api/client";
import type { TriageFormValues } from "./schemas";

function num(value?: string) {
  if (value === undefined || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toPayload(values: TriageFormValues) {
  const out: Record<string, string | number> = {};
  const temperature = num(values.temperature);
  const systolic = num(values.systolic);
  const diastolic = num(values.diastolic);
  const heartRate = num(values.heartRate);
  const respiratoryRate = num(values.respiratoryRate);
  const spo2 = num(values.spo2);
  const weightKg = num(values.weightKg);
  const heightCm = num(values.heightCm);
  const painScore = num(values.painScore);

  if (temperature !== undefined) out.temperature = temperature;
  if (systolic !== undefined) out.systolic = Math.trunc(systolic);
  if (diastolic !== undefined) out.diastolic = Math.trunc(diastolic);
  if (heartRate !== undefined) out.heartRate = Math.trunc(heartRate);
  if (respiratoryRate !== undefined) out.respiratoryRate = Math.trunc(respiratoryRate);
  if (spo2 !== undefined) out.spo2 = Math.trunc(spo2);
  if (weightKg !== undefined) out.weightKg = weightKg;
  if (heightCm !== undefined) out.heightCm = heightCm;
  if (painScore !== undefined) out.painScore = Math.trunc(painScore);
  if (values.notes?.trim()) out.notes = values.notes.trim();

  return out;
}

export async function recordTriage(encounterId: string, values: TriageFormValues) {
  const { data } = await api.put(`/encounters/${encounterId}/triage`, toPayload(values));
  return data;
}

export async function fetchTriage(encounterId: string) {
  const { data } = await api.get(`/encounters/${encounterId}/triage`);
  return data;
}
