import { api } from "@/lib/api/client";
import type { Patient } from "@/types/patient";
import type { AppointmentStatus } from "@/types/appointment";

export type Appointment = {
  id: string;
  patientId: string;
  scheduledAt: string;
  status: AppointmentStatus;
  notes: string | null;
  encounterId: string | null;
  patient: Patient;
  department?: { id: string; name: string; code: string } | null;
  service?: { id: string; name: string; code: string } | null;
};

export async function fetchAppointments(params?: {
  from?: string;
  to?: string;
  status?: AppointmentStatus;
}) {
  const { data } = await api.get<Appointment[]>("/appointments", { params });
  return data;
}

export async function createAppointment(body: {
  patientId: string;
  scheduledAt: string;
  departmentId?: string;
  serviceId?: string;
  notes?: string;
}) {
  const { data } = await api.post<Appointment>("/appointments", body);
  return data;
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
) {
  const { data } = await api.patch<Appointment>(`/appointments/${id}/status`, {
    status,
  });
  return data;
}
