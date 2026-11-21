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
  useCreateOtherIncome,
  useOtherIncomeSources,
  useOtherIncomes,
  useVoidOtherIncome,
} from "@/features/other-income/hooks";
import { PaymentMethod } from "@/types/finance";
import { formatCents } from "@/lib/format/money";
import {
  COLLECT_PAYMENT_METHODS,
  paymentMethodLabel,
} from "@/lib/format/payment-method";
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

export function OtherIncomeRecordPanel({ className }: { className?: string }) {
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const today = todayIso();

  const sources = useOtherIncomeSources();
  const list = useOtherIncomes(toApiFrom(monthStart), toApiTo(today));
  const create = useCreateOtherIncome();
  const voidMut = useVoidOtherIncome();

  const [sourceId, setSourceId] = useState("");
  const [otherName, setOtherName] = useState("");
  const [amountEtb, setAmountEtb] = useState("");
  const [incomeDate, setIncomeDate] = useState(today);
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [payer, setPayer] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptReference, setReceiptReference] = useState("");
  const [voidTarget, setVoidTarget] = useState<{
    id: string;
    incomeNumber: string;
  } | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const cents = etbToCents(amountEtb);
  const isOther =
    (sources.data ?? []).find((s) => s.id === sourceId)?.code === "OTHER";
  const canSave =
    sourceId &&
    (!isOther || otherName.trim()) &&
    cents != null &&
    incomeDate &&
    !create.isPending;

  const recentRows = useMemo(() => list.data ?? [], [list.data]);

  function resetForm() {
    setOtherName("");
    setAmountEtb("");
    setPayer("");
    setNotes("");
    setReceiptReference("");
    setIncomeDate(today);
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          Record other income
        </h2>
        <p className="text-xs text-muted">
          Money received outside patient billing (donations, rent, grants,
          etc.) - counted in the clinic net report.
        </p>
      </div>

      {sources.isLoading ? (
        <LoadingBlock label="Loading income sources" />
      ) : sources.isError ? (
        <ErrorState message="Could not load income sources." />
      ) : (
        <div className="grid gap-4 rounded-lg border border-border bg-card p-4 shadow-sm lg:grid-cols-2">
          <div className="space-y-3">
            <div>
              <Label htmlFor="inc-src">Income source</Label>
              <select
                id="inc-src"
                className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
              >
                <option value="">Select…</option>
                {(sources.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            {isOther ? (
              <div>
                <Label htmlFor="inc-other">Specify income source</Label>
                <Input
                  id="inc-other"
                  value={otherName}
                  onChange={(e) => setOtherName(e.target.value)}
                  placeholder="e.g. Lab space rental"
                  maxLength={120}
                  className="mt-1"
                />
                <p className="mt-1 text-2xs text-muted">
                  Saved as a new source, so it appears in the list next time.
                </p>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="inc-date">Income date</Label>
                <Input
                  id="inc-date"
                  type="date"
                  value={incomeDate}
                  onChange={(e) => setIncomeDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="inc-amt">Amount (ETB)</Label>
                <Input
                  id="inc-amt"
                  inputMode="decimal"
                  value={amountEtb}
                  onChange={(e) => setAmountEtb(e.target.value)}
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted">
                Received via
              </p>
              <div className="flex flex-wrap gap-2">
                {COLLECT_PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-xs font-medium",
                      method === m
                        ? "border-teal-700 bg-teal-800 text-white"
                        : "border-border bg-card text-foreground",
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
              <Label htmlFor="inc-payer">Received from (optional)</Label>
              <Input
                id="inc-payer"
                value={payer}
                onChange={(e) => setPayer(e.target.value)}
                placeholder="Person or organization"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="inc-notes">Reason / notes</Label>
              <textarea
                id="inc-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder="Why this money was received…"
                className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="inc-receipt">Receipt / voucher ref (optional)</Label>
              <Input
                id="inc-receipt"
                value={receiptReference}
                onChange={(e) => setReceiptReference(e.target.value)}
                placeholder="Receipt #, voucher no., etc."
                className="mt-1"
              />
            </div>
            <Button
              type="button"
              disabled={!canSave}
              onClick={() =>
                create.mutate(
                  {
                    ...(isOther
                      ? { newSourceName: otherName.trim() }
                      : { sourceId }),
                    amountCents: cents!,
                    incomeDate,
                    method,
                    payer: payer || undefined,
                    notes: notes || undefined,
                    receiptReference: receiptReference || undefined,
                  },
                  {
                    onSuccess: (saved) => {
                      resetForm();
                      if (isOther) setSourceId(saved.source.id);
                    },
                  },
                )
              }
            >
              {create.isPending ? "Saving…" : "Save income"}
            </Button>
          </div>
        </div>
      )}

      <ExpandablePanel
        title={
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Other income this month
            </h2>
            <p className="text-xs font-normal text-muted">
              {format(new Date(`${monthStart}T12:00:00`), "MMM yyyy")} · void
              mistakes with a reason
            </p>
          </div>
        }
      >
        {list.isLoading ? <LoadingBlock label="Loading income" /> : null}
        {list.isError ? (
          <ErrorState message="Could not load recent income." />
        ) : null}
        {list.isSuccess && recentRows.length === 0 ? (
          <EmptyState title="No other income recorded this month." />
        ) : null}
        {recentRows.length > 0 ? (
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell>Date</DataTableHeaderCell>
                <DataTableHeaderCell>Income</DataTableHeaderCell>
                <DataTableHeaderCell>Source</DataTableHeaderCell>
                <DataTableHeaderCell>Amount</DataTableHeaderCell>
                <DataTableHeaderCell>Method</DataTableHeaderCell>
                <DataTableHeaderCell>Reason / notes</DataTableHeaderCell>
                <DataTableHeaderCell stickyRight>Actions</DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {recentRows.map((row) => (
                <DataTableRow key={row.id}>
                  <DataTableCell className="whitespace-nowrap tabular-nums">
                    {row.incomeDate.slice(0, 10)}
                  </DataTableCell>
                  <DataTableCell className="font-medium">
                    {row.incomeNumber}
                  </DataTableCell>
                  <DataTableCell>{row.source.name}</DataTableCell>
                  <DataTableCell className="tabular-nums">
                    {formatCents(row.amountCents)}
                  </DataTableCell>
                  <DataTableCell>
                    {paymentMethodLabel(row.paymentMethod)}
                  </DataTableCell>
                  <DataTableCell className="max-w-[220px] truncate text-muted">
                    {[row.payer, row.notes].filter(Boolean).join(" · ") || "-"}
                  </DataTableCell>
                  <DataTableCell stickyRight className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setVoidTarget({
                          id: row.id,
                          incomeNumber: row.incomeNumber,
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
        title="Void income"
        primaryLabel={voidMut.isPending ? "Voiding…" : "Void income"}
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
        <p className="text-sm text-foreground">
          Void <strong>{voidTarget?.incomeNumber}</strong>? This stays in the
          audit trail but is excluded from totals.
        </p>
        <Label htmlFor="inc-void-reason" className="mt-3 block text-xs">
          Reason
        </Label>
        <Input
          id="inc-void-reason"
          value={voidReason}
          onChange={(e) => setVoidReason(e.target.value)}
          className="mt-1"
          placeholder="Why voiding…"
        />
      </SimpleDialog>
    </div>
  );
}
