import { fetchEncounters } from "@/features/encounters/api";
import { fetchExpiring, fetchLowStock, fetchStock } from "@/features/inventory/api";
import { fetchLabOrders } from "@/features/laboratory/api";
import { fetchPatients } from "@/features/patients/api";
import { fetchPrescriptions } from "@/features/prescriptions/api";

export type OperationalSnapshot = {
  patientsTotal: number;
  encountersTotal: number;
  encountersByStatus: Record<string, number>;
  labOrdersTotal: number;
  labOrdersByStatus: Record<string, number>;
  prescriptionsTotal: number;
  prescriptionsByStatus: Record<string, number>;
  stockSkuCount: number;
  lowStockSkuCount: number;
  expiringBatchCount: number;
};

function countByStatus<T extends { status: string }>(items: T[]) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});
}

async function settled<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

export async function fetchOperationalSnapshot(): Promise<OperationalSnapshot> {
  const patientsPage = await settled(
    fetchPatients({ page: 1, limit: 1 }),
    { items: [], total: 0, page: 1, limit: 1 },
  );
  const encounters = await settled(fetchEncounters(), []);
  const labOrders = await settled(fetchLabOrders(), []);
  const prescriptions = await settled(fetchPrescriptions(), []);
  const stock = await settled(fetchStock(), []);
  const lowStock = await settled(fetchLowStock(), []);
  const expiring = await settled(fetchExpiring(), []);

  return {
    patientsTotal: patientsPage.total,
    encountersTotal: encounters.length,
    encountersByStatus: countByStatus(encounters),
    labOrdersTotal: labOrders.length,
    labOrdersByStatus: countByStatus(labOrders),
    prescriptionsTotal: prescriptions.length,
    prescriptionsByStatus: countByStatus(prescriptions),
    stockSkuCount: stock.length,
    lowStockSkuCount: lowStock.length,
    expiringBatchCount: expiring.length,
  };
}
