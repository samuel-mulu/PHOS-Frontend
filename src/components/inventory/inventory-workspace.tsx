"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/shared/data-table";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/shared/state-blocks";
import { ExpandablePanel } from "@/components/shared/table-layout";
import {
  useAdjustStock,
  useExpiring,
  useLowStock,
  useReceiveStock,
  useStock,
} from "@/features/inventory/hooks";
import { useMedicines } from "@/features/prescriptions/hooks";
import { useCurrentUser } from "@/features/auth/hooks";
import { Role } from "@/types/role";

type Tab = "stock" | "low" | "expiring" | "receive" | "adjust";

export function InventoryWorkspace() {
  const [tab, setTab] = useState<Tab>("stock");
  const { data: user } = useCurrentUser();
  const canMutate =
    user?.role === Role.STOREKEEPER ||
    user?.role === Role.ADMIN ||
    user?.role === Role.CEO;

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "stock", label: "Stock levels" },
    { id: "low", label: "Low stock" },
    { id: "expiring", label: "Expiring" },
    { id: "receive", label: "Receive" },
    { id: "adjust", label: "Adjust" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Inventory</h1>
        <p className="text-sm text-slate-600">
          Batches, movements, and stock views from the backend.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.id}
            type="button"
            size="sm"
            variant={tab === t.id ? "default" : "outline"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>
      {tab === "stock" ? <StockTab /> : null}
      {tab === "low" ? <LowStockTab /> : null}
      {tab === "expiring" ? <ExpiringTab /> : null}
      {tab === "receive" ? <ReceiveTab enabled={canMutate} /> : null}
      {tab === "adjust" ? <AdjustTab enabled={canMutate} /> : null}
    </div>
  );
}

function StockTab() {
  const stock = useStock();
  if (stock.isLoading) return <LoadingBlock label="Loading stock" />;
  if (stock.isError) return <ErrorState message="Could not load stock." />;
  if (!stock.data?.length) return <EmptyState title="No medicines" />;

  return (
    <ExpandablePanel title="Stock levels">
      <DataTable>
        <DataTableHead>
          <tr>
            <DataTableHeaderCell>Medicine</DataTableHeaderCell>
            <DataTableHeaderCell>On hand</DataTableHeaderCell>
            <DataTableHeaderCell>Reorder</DataTableHeaderCell>
            <DataTableHeaderCell>Batches</DataTableHeaderCell>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {stock.data.map((m) => {
            const onHand = m.batches.reduce(
              (s, b) => s + b.quantityRemaining,
              0,
            );
            return (
              <DataTableRow key={m.id}>
                <DataTableCell>
                  {m.code} — {m.name}
                </DataTableCell>
                <DataTableCell>{onHand}</DataTableCell>
                <DataTableCell>{m.reorderLevel}</DataTableCell>
                <DataTableCell className="text-xs">
                  {m.batches.map((b) => (
                    <div key={b.id}>
                      {b.batchNumber}: {b.quantityRemaining} (exp{" "}
                      {format(new Date(b.expiryDate), "yyyy-MM-dd")})
                    </div>
                  ))}
                </DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
    </ExpandablePanel>
  );
}

function LowStockTab() {
  const low = useLowStock();
  if (low.isLoading) return <LoadingBlock />;
  if (!low.data?.length) return <EmptyState title="No low-stock items" />;
  return (
    <ul className="space-y-2 text-sm">
      {low.data.map((m) => (
        <li key={m.id} className="rounded border bg-white p-3">
          {m.name} — reorder at {m.reorderLevel}
        </li>
      ))}
    </ul>
  );
}

function ExpiringTab() {
  const exp = useExpiring();
  if (exp.isLoading) return <LoadingBlock />;
  if (!exp.data?.length) return <EmptyState title="Nothing expiring soon" />;
  return (
    <ExpandablePanel title="Expiring batches">
      <DataTable>
        <DataTableHead>
          <tr>
            <DataTableHeaderCell>Medicine</DataTableHeaderCell>
            <DataTableHeaderCell>Batch</DataTableHeaderCell>
            <DataTableHeaderCell>Qty</DataTableHeaderCell>
            <DataTableHeaderCell>Expiry</DataTableHeaderCell>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {exp.data.map((b) => (
            <DataTableRow key={b.id}>
              <DataTableCell>{b.medicine.name}</DataTableCell>
              <DataTableCell>{b.batchNumber}</DataTableCell>
              <DataTableCell>{b.quantityRemaining}</DataTableCell>
              <DataTableCell>
                {format(new Date(b.expiryDate), "dd MMM yyyy")}
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </ExpandablePanel>
  );
}

function ReceiveTab({ enabled }: { enabled: boolean }) {
  const medicines = useMedicines();
  const receive = useReceiveStock();
  const [medicineId, setMedicineId] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [quantity, setQuantity] = useState(100);
  const [unitCostCents, setUnitCostCents] = useState(500);

  if (!enabled) {
    return (
      <p className="text-sm text-slate-600">
        Receive stock requires Storekeeper or Admin role.
      </p>
    );
  }

  return (
    <form
      className="max-w-md space-y-3 rounded-lg border bg-white p-4 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        receive.mutate({
          medicineId,
          batchNumber,
          expiryDate,
          quantity,
          unitCostCents,
        });
      }}
    >
      <Field label="Medicine">
        <select
          className="h-10 w-full rounded-md border px-2 text-sm"
          value={medicineId}
          onChange={(e) => setMedicineId(e.target.value)}
          required
        >
          <option value="">Select</option>
          {medicines.data?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.code} — {m.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Batch number">
        <Input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} required />
      </Field>
      <Field label="Expiry date">
        <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required />
      </Field>
      <Field label="Quantity">
        <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
      </Field>
      <Field label="Unit cost (cents)">
        <Input type="number" min={0} value={unitCostCents} onChange={(e) => setUnitCostCents(Number(e.target.value))} />
      </Field>
      <Button type="submit" disabled={receive.isPending || !medicineId}>
        Receive stock
      </Button>
    </form>
  );
}

function AdjustTab({ enabled }: { enabled: boolean }) {
  const stock = useStock();
  const adjust = useAdjustStock();
  const [batchId, setBatchId] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState("");

  if (!enabled) {
    return (
      <p className="text-sm text-slate-600">
        Adjustments require Storekeeper or Admin role.
      </p>
    );
  }

  const batches =
    stock.data?.flatMap((m) =>
      m.batches.map((b) => ({
        id: b.id,
        label: `${m.code} · ${b.batchNumber} (${b.quantityRemaining})`,
      })),
    ) ?? [];

  return (
    <form
      className="max-w-md space-y-3 rounded-lg border bg-white p-4 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        adjust.mutate({ batchId, quantity, reason });
      }}
    >
      <Field label="Batch">
        <select
          className="h-10 w-full rounded-md border px-2 text-sm"
          value={batchId}
          onChange={(e) => setBatchId(e.target.value)}
          required
        >
          <option value="">Select batch</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Quantity (+ in / − out)">
        <Input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required />
      </Field>
      <Field label="Reason">
        <Input value={reason} onChange={(e) => setReason(e.target.value)} required minLength={3} />
      </Field>
      <Button type="submit" disabled={adjust.isPending || !batchId || quantity === 0}>
        Apply adjustment
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block text-xs">{label}</Label>
      {children}
    </div>
  );
}
