"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  fetchPaymentReport,
  paymentReportToCsv,
  type PaymentReport,
} from "@/features/payments/report";
import { formatCents } from "@/lib/format/money";
import { paymentMethodLabel } from "@/lib/format/payment-method";
import { cn } from "@/lib/utils";

type Preset = "day" | "month" | "range";

function todayIso() {
  return format(new Date(), "yyyy-MM-dd");
}

function toApiFrom(date: string) {
  return new Date(`${date}T00:00:00`).toISOString();
}

function toApiTo(date: string) {
  return new Date(`${date}T23:59:59.999`).toISOString();
}

function patientName(row: PaymentReport["rows"][number]) {
  return [row.patient.firstName, row.patient.middleName, row.patient.lastName]
    .filter(Boolean)
    .join(" ");
}

function downloadCsv(report: PaymentReport, from: string, to: string) {
  const csv = paymentReportToCsv(report);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `payments-${from}-to-${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function PaymentsReportPanel({ className }: { className?: string }) {
  const [preset, setPreset] = useState<Preset>("day");
  const [from, setFrom] = useState(todayIso);
  const [to, setTo] = useState(todayIso);

  function applyPreset(next: Preset) {
    setPreset(next);
    const now = new Date();
    if (next === "day") {
      const d = todayIso();
      setFrom(d);
      setTo(d);
    } else if (next === "month") {
      setFrom(format(startOfMonth(now), "yyyy-MM-dd"));
      setTo(format(endOfMonth(now), "yyyy-MM-dd"));
    }
  }

  const query = useQuery({
    queryKey: ["payments", "report", from, to],
    queryFn: () => fetchPaymentReport(toApiFrom(from), toApiTo(to)),
    enabled: Boolean(from && to),
  });

  const methodRows = useMemo(() => {
    const by = query.data?.totals.byMethod ?? {};
    return Object.entries(by).sort((a, b) => b[1].amountCents - a[1].amountCents);
  }, [query.data]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["day", "Today"],
              ["month", "This month"],
              ["range", "Custom range"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium",
                preset === id
                  ? "bg-teal-800 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200",
              )}
              onClick={() => applyPreset(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label htmlFor="pay-report-from">From</Label>
            <Input
              id="pay-report-from"
              type="date"
              value={from}
              onChange={(e) => {
                setPreset("range");
                setFrom(e.target.value);
              }}
              className="mt-1 w-auto"
            />
          </div>
          <div>
            <Label htmlFor="pay-report-to">To</Label>
            <Input
              id="pay-report-to"
              type="date"
              value={to}
              onChange={(e) => {
                setPreset("range");
                setTo(e.target.value);
              }}
              className="mt-1 w-auto"
            />
          </div>
        </div>

        {query.data ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadCsv(query.data, from, to)}
          >
            Export CSV
          </Button>
        ) : null}
      </div>

      {query.isLoading ? <LoadingBlock label="Loading payment report" /> : null}
      {query.isError ? (
        <ErrorState message="Could not load payment report." />
      ) : null}

      {query.data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryTile label="Payments" value={String(query.data.totals.count)} />
            <SummaryTile
              label="Collected"
              value={formatCents(query.data.totals.amountCents)}
            />
            <SummaryTile
              label="Refunded"
              value={formatCents(query.data.totals.refundedCents)}
            />
            <SummaryTile
              label="Net"
              value={formatCents(query.data.totals.netCents)}
              emphasize
            />
          </div>

          {methodRows.length > 0 ? (
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              {methodRows.map(([method, stats]) => (
                <span
                  key={method}
                  className="rounded-md bg-slate-100 px-2 py-1 tabular-nums"
                >
                  {paymentMethodLabel(method)}: {stats.count} ·{" "}
                  {formatCents(stats.amountCents)}
                </span>
              ))}
            </div>
          ) : null}

          <ExpandablePanel
            title={
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Payment detail
                </h2>
                <p className="text-xs text-slate-600">
                  {format(new Date(query.data.period.from), "dd MMM yyyy")} —{" "}
                  {format(new Date(query.data.period.to), "dd MMM yyyy")}
                </p>
              </div>
            }
          >
            {query.data.rows.length === 0 ? (
              <EmptyState title="No payments in this period." />
            ) : (
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell>Date / time</DataTableHeaderCell>
                    <DataTableHeaderCell>Payment</DataTableHeaderCell>
                    <DataTableHeaderCell>Patient</DataTableHeaderCell>
                    <DataTableHeaderCell>Invoice</DataTableHeaderCell>
                    <DataTableHeaderCell>Method</DataTableHeaderCell>
                    <DataTableHeaderCell>Amount</DataTableHeaderCell>
                    <DataTableHeaderCell>Net</DataTableHeaderCell>
                    <DataTableHeaderCell>Cashier</DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <DataTableBody>
                  {query.data.rows.map((row) => (
                    <DataTableRow key={row.id}>
                      <DataTableCell className="whitespace-nowrap tabular-nums">
                        {format(new Date(row.createdAt), "dd MMM yyyy HH:mm")}
                      </DataTableCell>
                      <DataTableCell className="font-medium">
                        {row.paymentNumber}
                      </DataTableCell>
                      <DataTableCell>
                        <div className="font-medium text-slate-900">
                          {patientName(row)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {row.patient.patientNumber}
                        </div>
                      </DataTableCell>
                      <DataTableCell>{row.invoice.invoiceNumber}</DataTableCell>
                      <DataTableCell>
                        {paymentMethodLabel(row.method)}
                      </DataTableCell>
                      <DataTableCell className="tabular-nums">
                        {formatCents(row.amountCents)}
                        {row.refundedCents > 0 ? (
                          <div className="text-xs text-red-700">
                            −{formatCents(row.refundedCents)}
                          </div>
                        ) : null}
                      </DataTableCell>
                      <DataTableCell className="tabular-nums font-medium">
                        {formatCents(row.netCents)}
                      </DataTableCell>
                      <DataTableCell className="text-slate-600">
                        {row.recordedBy.firstName} {row.recordedBy.lastName}
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            )}
          </ExpandablePanel>
        </>
      ) : null}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-slate-200 bg-white px-3 py-2",
        emphasize && "border-teal-200 bg-teal-50/40",
      )}
    >
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 text-base font-semibold tabular-nums text-slate-900">
        {value}
      </div>
    </div>
  );
}
