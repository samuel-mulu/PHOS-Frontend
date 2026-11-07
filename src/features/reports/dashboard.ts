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
  /** Still owed across open invoices (pay later + part paid). */
  outstandingCents?: number;
  deferredTodayCount?: number;
  waivedTodayCents?: number;
};

export async function fetchDashboardStats() {
  const { data } = await api.get<DashboardStats>("/reports/dashboard");
  return data;
}
