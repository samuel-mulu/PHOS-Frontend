import { api } from "@/lib/api/client";
import type { QueueStation } from "@/types/encounter";
import type { Patient } from "@/types/patient";
import type { EncounterPriority } from "@/types/encounter";

export type QueueEntry = {
  id: string;
  encounterId: string;
  station: QueueStation;
  status: string;
  priority: EncounterPriority;
  enteredAt: string;
  calledAt: string | null;
  serviceStartedAt: string | null;
  assignedToId?: string | null;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  encounter: {
    id: string;
    encounterNumber: string;
    status: string;
    reason: string | null;
    assignedDoctorId?: string | null;
    paymentReturnStation?: "TRIAGE" | "DOCTOR" | "LAB" | "PHARMACY" | "CASHIER" | null;
    assignedDoctor?: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
    patient: Patient;
    service?: { name: string } | null;
    type: string;
  };
};

export async function fetchQueue(station: QueueStation) {
  const { data } = await api.get<QueueEntry[]>(`/queues/${station}`);
  return data;
}

export async function updateQueueEntry(
  id: string,
  body: { status: string; assignedToId?: string },
) {
  const { data } = await api.patch<QueueEntry>(`/queue-entries/${id}`, body);
  return data;
}
