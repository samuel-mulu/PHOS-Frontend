import { api } from "@/lib/api/client";

export type InventoryBatch = {
  id: string;
  batchNumber: string;
  expiryDate: string;
  quantityReceived: number;
  quantityRemaining: number;
  unitCostCents: number;
};

export type MedicineStock = {
  id: string;
  code: string;
  name: string;
  reorderLevel: number;
  batches: InventoryBatch[];
};

export type ExpiringBatch = InventoryBatch & {
  medicine: { id: string; code: string; name: string };
};

export async function fetchStock() {
  const { data } = await api.get<MedicineStock[]>("/inventory/stock");
  return data;
}

export async function fetchLowStock() {
  const { data } = await api.get<MedicineStock[]>("/inventory/low-stock");
  return data;
}

export async function fetchExpiring() {
  const { data } = await api.get<ExpiringBatch[]>("/inventory/expiring");
  return data;
}

export async function receiveStock(body: {
  medicineId: string;
  supplierId?: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  unitCostCents: number;
}) {
  const { data } = await api.post("/inventory/receipts", {
    ...body,
    expiryDate: new Date(body.expiryDate).toISOString(),
  });
  return data;
}

export async function adjustStock(body: {
  batchId: string;
  quantity: number;
  reason: string;
}) {
  const { data } = await api.post("/inventory/adjustments", body);
  return data;
}
