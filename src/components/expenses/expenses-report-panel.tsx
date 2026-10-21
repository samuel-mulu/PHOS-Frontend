"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { loadClinicLogoDataUrl } from "@/lib/print/hiwet-brand";
import { buildExpensesReportHtml } from "@/lib/print/expenses-report-html";
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
  expenseReportToCsv,
  fetchExpenseReport,
  type ExpenseReport,
} from "@/features/expenses/report";
import { fetchPaymentReport } from "@/features/payments/report";
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

function monthRangeIso() {
  const now = new Date();
  return {
    from: format(startOfMonth(now), "yyyy-MM-dd"),
    to: format(endOfMonth(now), "yyyy-MM-dd"),
  };
}

async function printPdf(
  report: ExpenseReport,
  from: string,
  to: string,
  collectionsNetCents: number | null,
) {
  const logoUrl = await loadClinicLogoDataUrl();
  const fromLabel = format(new Date(`${from}T12:00:00`), "dd MMM yyyy");
  const toLabel = format(new Date(`${to}T12:00:00`), "dd MMM yyyy");
  const html = buildExpensesReportHtml({
    report,
    fromLabel,
    toLabel,
    logoUrl,
    collectionsNetCents,
  });
  const w = window.open("", "_blank", "width=1100,height=800");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  window.setTimeout(() => w.print(), 80);
}

function downloadCsv(report: ExpenseReport, from: string, to: string) {
  const csv = expenseReportToCsv(report);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `expenses-${from}-to-${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExpensesReportPanel({
  className,
  showHeading = true,
}: {
  className?: string;
  showHeading?: boolean;
}) {
  const initialMonth = monthRangeIso();
  const [preset, setPreset] = useState<Preset>("month");
  const [from, setFrom] = useState(initialMonth.from);
  const [to, setTo] = useState(initialMonth.to);

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

  const apiFrom = toApiFrom(from);
  const apiTo = toApiTo(to);

  const query = useQuery({
    queryKey: ["expenses", "report", from, to],
    queryFn: () => fetchExpenseReport(apiFrom, apiTo),
    enabled: Boolean(from && to),
  });

  const collectionsQuery = useQuery({
    queryKey: ["payments", "report", from, to, "for-expenses-net"],
    queryFn: () => fetchPaymentReport(apiFrom, apiTo),
    enabled: Boolean(from && to),
  });

  const collectionsNet = collectionsQuery.data?.totals.netCents ?? null;
  const clinicNet =
    collectionsNet != null && query.data
      ? collectionsNet - query.data.totals.amountCents
      : null;

  const categoryRows = useMemo(
    () => query.data?.totals.byCategory ?? [],
    [query.data],
  );

  const periodLabel = `${format(new Date(`${from}T12:00:00`), "dd MMM yyyy")} – ${format(new Date(`${to}T12:00:00`), "dd MMM yyyy")}`;

  const recordedRows = useMemo(
    () => (query.data?.rows ?? []).filter((r) => r.status === "RECORDED"),
    [query.data],
  );

  return (
    <div className={cn("space-y-4", className)}>
      {showHeading ? (
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Expense report
          </h2>
          <p className="text-xs text-slate-600">
            Recorded expenses by category · compare to collections for net cash
            · print PDF or CSV
          </p>
        </div>
      ) : null}

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
            <Label htmlFor="exp-report-from">From</Label>
            <Input
              id="exp-report-from"
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
            <Label htmlFor="exp-report-to">To</Label>
            <Input
              id="exp-report-to"
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
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                void printPdf(query.data!, from, to, collectionsNet)
              }
            >
              Print / PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => downloadCsv(query.data!, from, to)}
            >
              Export CSV
            </Button>
          </>
        ) : null}
      </div>

      {query.data ? (
        <p className="text-xs text-slate-500">Period: {periodLabel}</p>
      ) : null}

      {query.isLoading ? <LoadingBlock label="Loading expense report" /> : null}
      {query.isError ? (
        <ErrorState message="Could not load expense report." />
      ) : null}

      {query.data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryTile
              label="Expenses"
              value={String(query.data.totals.count)}
            />
            <SummaryTile
              label="Total spent"
              value={formatCents(query.data.totals.amountCents)}
            />
            <SummaryTile
              label="Voided"
              value={`${query.data.totals.voidedCount} · ${formatCents(query.data.totals.voidedCents)}`}
            />
            <SummaryTile
              label="Collections (net)"
              value={
                collectionsQuery.isLoading
                  ? "…"
                  : collectionsNet != null
                    ? formatCents(collectionsNet)
                    : "-"
              }
            />
            <SummaryTile
              label="Clinic net"
              value={
                clinicNet != null ? formatCents(clinicNet) : "-"
              }
              emphasize
            />
          </div>

          {categoryRows.length > 0 ? (
            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
              {categoryRows.map((c) => (
                <span
                  key={c.categoryId}
                  className="rounded-md bg-slate-100 px-2 py-1 tabular-nums"
                >
                  {c.name}: {c.count} · {formatCents(c.amountCents)}
                </span>
              ))}
            </div>
          ) : null}

          <ExpandablePanel
            title={
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Expense detail
                </h2>
                <p className="text-xs text-slate-600">{periodLabel}</p>
              </div>
            }
          >
            {recordedRows.length === 0 ? (
              <EmptyState title="No recorded expenses in this period." />
            ) : (
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell>Date</DataTableHeaderCell>
                    <DataTableHeaderCell>Expense</DataTableHeaderCell>
                    <DataTableHeaderCell>Category</DataTableHeaderCell>
                    <DataTableHeaderCell>Method</DataTableHeaderCell>
                    <DataTableHeaderCell>Amount</DataTableHeaderCell>
                    <DataTableHeaderCell>Vendor / note</DataTableHeaderCell>
                    <DataTableHeaderCell>Receipt ref</DataTableHeaderCell>
                    <DataTableHeaderCell>Staff</DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <DataTableBody>
                  {recordedRows.map((row) => {
                    const note = [row.vendor, row.description]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <DataTableRow key={row.id}>
                        <DataTableCell className="whitespace-nowrap tabular-nums">
                          {row.expenseDate}
                        </DataTableCell>
                        <DataTableCell className="font-medium">
                          {row.expenseNumber}
                        </DataTableCell>
                        <DataTableCell>{row.category.name}</DataTableCell>
                        <DataTableCell>
                          {paymentMethodLabel(row.method)}
                        </DataTableCell>
                        <DataTableCell className="tabular-nums">
                          {formatCents(row.amountCents)}
                        </DataTableCell>
                        <DataTableCell className="max-w-[200px] truncate text-slate-600">
                          {note || "-"}
                        </DataTableCell>
                        <DataTableCell className="text-slate-600">
                          {row.receiptReference ?? "-"}
                        </DataTableCell>
                        <DataTableCell className="text-slate-600">
                          {row.recordedBy.firstName} {row.recordedBy.lastName}
                        </DataTableCell>
                      </DataTableRow>
                    );
                  })}
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
