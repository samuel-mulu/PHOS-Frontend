"use client";

import { useMemo, useState } from "react";
import { format, startOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleDialog } from "@/components/shared/simple-dialog";
import {
  EmptyState,
  ErrorState,
  LoadingBlock,
} from "@/components/shared/state-blocks";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/shared/data-table";
import { ExpandablePanel } from "@/components/shared/table-layout";
import {
  useCreateExpense,
  useExpenseCategories,
  useExpenses,
  useVoidExpense,
} from "@/features/expenses/hooks";
import { PaymentMethod } from "@/types/finance";
import { formatCents } from "@/lib/format/money";
import { paymentMethodLabel } from "@/lib/format/payment-method";
import { cn } from "@/lib/utils";

function etbToCents(etb: string): number | null {
  const n = Number(etb);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function todayIso() {
  return format(new Date(), "yyyy-MM-dd");
}

function toApiFrom(date: string) {
  return new Date(`${date}T00:00:00`).toISOString();
}

function toApiTo(date: string) {
  return new Date(`${date}T23:59:59.999`).toISOString();
}

const PRIMARY_METHODS: PaymentMethod[] = [
  PaymentMethod.CASH,
  PaymentMethod.CARD,
  PaymentMethod.TELEBIRR,
  PaymentMethod.BANK_TRANSFER,
];

export function ExpenseRecordPanel({ className }: { className?: string }) {
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const today = todayIso();

  const categories = useExpenseCategories();
  const list = useExpenses(toApiFrom(monthStart), toApiTo(today));
  const create = useCreateExpense();
  const voidMut = useVoidExpense();

  const [categoryId, setCategoryId] = useState("");
  const [amountEtb, setAmountEtb] = useState("");
  const [expenseDate, setExpenseDate] = useState(today);
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [vendor, setVendor] = useState("");
  const [description, setDescription] = useState("");
  const [receiptReference, setReceiptReference] = useState("");
  const [voidTarget, setVoidTarget] = useState<{
    id: string;
    expenseNumber: string;
  } | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const cents = etbToCents(amountEtb);
  const canSave =
    categoryId &&
    cents != null &&
    expenseDate &&
    !create.isPending;

  const recentRows = useMemo(() => list.data ?? [], [list.data]);

  function resetForm() {
    setAmountEtb("");
    setVendor("");
    setDescription("");
    setReceiptReference("");
    setExpenseDate(today);
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Record expense</h2>
        <p className="text-xs text-slate-600">
          Outgoing payments (supplies, utilities, etc.) - receipt reference is
          optional text for now.
        </p>
      </div>

      {categories.isLoading ? (
        <LoadingBlock label="Loading categories" />
      ) : categories.isError ? (
        <ErrorState message="Could not load expense categories." />
      ) : (
        <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-2">
          <div className="space-y-3">
            <div>
              <Label htmlFor="exp-cat">Category</Label>
              <select
                id="exp-cat"
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Select…</option>
                {(categories.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="exp-date">Expense date</Label>
                <Input
                  id="exp-date"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="exp-amt">Amount (ETB)</Label>
                <Input
                  id="exp-amt"
                  inputMode="decimal"
                  value={amountEtb}
                  onChange={(e) => setAmountEtb(e.target.value)}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-slate-600">
                Paid via
              </p>
              <div className="flex flex-wrap gap-2">
                {PRIMARY_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-xs font-medium",
                      method === m
                        ? "border-teal-700 bg-teal-800 text-white"
                        : "border-slate-200 bg-white text-slate-700",
                    )}
                    onClick={() => setMethod(m)}
                  >
                    {paymentMethodLabel(m)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="exp-vendor">Vendor / payee (optional)</Label>
              <Input
                id="exp-vendor"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="exp-desc">Note (optional)</Label>
              <Input
                id="exp-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="exp-receipt">Receipt / voucher ref (optional)</Label>
              <Input
                id="exp-receipt"
                value={receiptReference}
                onChange={(e) => setReceiptReference(e.target.value)}
                placeholder="Invoice #, voucher no., etc."
                className="mt-1"
              />
            </div>
            <Button
              type="button"
              disabled={!canSave}
              onClick={() =>
                create.mutate(
                  {
                    categoryId,
                    amountCents: cents!,
                    expenseDate,
                    method,
                    vendor: vendor || undefined,
                    description: description || undefined,
                    receiptReference: receiptReference || undefined,
                  },
                  { onSuccess: () => resetForm() },
                )
              }
            >
              {create.isPending ? "Saving…" : "Save expense"}
            </Button>
          </div>
        </div>
      )}

      <ExpandablePanel
        title={
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              This month (recorded)
            </h2>
            <p className="text-xs font-normal text-slate-500">
              {format(new Date(`${monthStart}T12:00:00`), "MMM yyyy")} · void
              mistakes with a reason
            </p>
          </div>
        }
      >
        {list.isLoading ? <LoadingBlock label="Loading expenses" /> : null}
        {list.isError ? (
          <ErrorState message="Could not load recent expenses." />
        ) : null}
        {list.isSuccess && recentRows.length === 0 ? (
          <EmptyState title="No expenses recorded this month." />
        ) : null}
        {recentRows.length > 0 ? (
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell>Date</DataTableHeaderCell>
                <DataTableHeaderCell>Expense</DataTableHeaderCell>
                <DataTableHeaderCell>Category</DataTableHeaderCell>
                <DataTableHeaderCell>Amount</DataTableHeaderCell>
                <DataTableHeaderCell>Method</DataTableHeaderCell>
                <DataTableHeaderCell stickyRight>Actions</DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {recentRows.map((row) => (
                <DataTableRow key={row.id}>
                  <DataTableCell className="whitespace-nowrap tabular-nums">
                    {row.expenseDate.slice(0, 10)}
                  </DataTableCell>
                  <DataTableCell className="font-medium">
                    {row.expenseNumber}
                  </DataTableCell>
                  <DataTableCell>{row.category.name}</DataTableCell>
                  <DataTableCell className="tabular-nums">
                    {formatCents(row.amountCents)}
                  </DataTableCell>
                  <DataTableCell>
                    {paymentMethodLabel(row.paymentMethod)}
                  </DataTableCell>
                  <DataTableCell stickyRight className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setVoidTarget({
                          id: row.id,
                          expenseNumber: row.expenseNumber,
                        })
                      }
                    >
                      Void
                    </Button>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        ) : null}
      </ExpandablePanel>

      <SimpleDialog
        open={Boolean(voidTarget)}
        title="Void expense"
        primaryLabel={voidMut.isPending ? "Voiding…" : "Void expense"}
        onPrimary={() => {
          if (!voidTarget || !voidReason.trim() || voidMut.isPending) return;
          voidMut.mutate(
            { id: voidTarget.id, reason: voidReason.trim() },
            {
              onSuccess: () => {
                setVoidTarget(null);
                setVoidReason("");
              },
            },
          );
        }}
        onClose={() => {
          setVoidTarget(null);
          setVoidReason("");
        }}
      >
        <p className="text-sm text-slate-700">
          Void <strong>{voidTarget?.expenseNumber}</strong>? This stays in the
          audit trail but is excluded from totals.
        </p>
        <Label htmlFor="void-reason" className="mt-3 block text-xs">
          Reason
        </Label>
        <Input
          id="void-reason"
          value={voidReason}
          onChange={(e) => setVoidReason(e.target.value)}
          className="mt-1"
          placeholder="Why voiding…"
        />
      </SimpleDialog>
    </div>
  );
}
