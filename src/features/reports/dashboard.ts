import { api } from "@/lib/api/client";

export type DashboardStats = {
  asOf: string;
  patientsRegisteredToday: number;
  activeEncounters: number;
  withDoctor: number;
  waitingDoctor: number;
  inTriage: number;
  waitingPayment: number;
  activeLabOrders: number;
  pendingInvoices: number;
  appointmentsToday: number;
};

export async function fetchDashboardStats() {
  const { data } = await api.get<DashboardStats>("/reports/dashboard");
  return data;
}
