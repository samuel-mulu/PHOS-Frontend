"use client";

import { useMemo, useState } from "react";
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
import { StatusBadge } from "@/components/shared/status-badge";
import {
  receivablePatientName,
  receivablesToCsv,
  useReceivables,
  type ReceivableRow,
  type ReceivablesReport,
} from "@/features/payments/receivables";
import { formatCents } from "@/lib/format/money";
import { loadClinicLogoDataUrl } from "@/lib/print/hiwet-brand";
import { buildReceivablesReportHtml } from "@/lib/print/receivables-report-html";
import { cn } from "@/lib/utils";

type Preset = "day" | "month" | "range";

const iso = (d: Date) => format(d, "yyyy-MM-dd");
const toApiFrom = (date: string) => new Date(`${date}T00:00:00`).toISOString();
const toApiTo = (date: string) => new Date(`${date}T23:59:59.999`).toISOString();
const label = (date: string) => format(new Date(`${date}T12:00:00`), "dd MMM yyyy");

async function printPdf(report: ReceivablesReport, from: string, to: string) {
  const logoUrl = await loadClinicLogoDataUrl();
  const html = buildReceivablesReportHtml({
    report,
    fromLabel: label(from),
    toLabel: label(to),
    logoUrl,
  });
  const w = window.open("", "_blank", "width=1100,height=800");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  window.setTimeout(() => w.print(), 80);
}

function downloadCsv(report: ReceivablesReport) {
  const blob = new Blob([receivablesToCsv(report)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `unpaid-debts-${iso(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Unpaid & debts: who owes money now (pay later, partial), aging, and
 * billed / collected / pay later / waived for the chosen period.
 */
export function ReceivablesReportPanel({
  className,
  showHeading = true,
  onCollect,
}: {
  className?: string;
  showHeading?: boolean;
  /** Cashier only: open this invoice to collect or waive. */
  onCollect?: (row: ReceivableRow) => void;
}) {
  const now = new Date();
  const [preset, setPreset] = useState<Preset>("month");
  const [from, setFrom] = useState(iso(startOfMonth(now)));
  const [to, setTo] = useState(iso(endOfMonth(now)));
  const [search, setSearch] = useState("");
  const query = useReceivables(toApiFrom(from), toApiTo(to));

  function applyPreset(next: Preset) {
    setPreset(next);
    const d = new Date();
    if (next === "day") {
      setFrom(iso(d));
      setTo(iso(d));
    } else if (next === "month") {
      setFrom(iso(startOfMonth(d)));
      setTo(iso(endOfMonth(d)));
    }
  }

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = query.data?.rows ?? [];
    if (!q) return all;
    return all.filter((r) =>
      [
        receivablePatientName(r.patient),
        r.patient.patientNumber,
        r.patient.phone ?? "",
        r.invoiceNumber,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [query.data, search]);

  const t = query.data?.totals;
  const p = query.data?.periodTotals;

  return (
    <div className={cn("space-y-4", className)}>
      {showHeading ? (
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Unpaid &amp; debts
          </h2>
          <p className="text-xs text-muted">
            Patients who still owe (pay later or part paid). Owed totals are as
            of now; the period sets billed, collected, pay later and waived.
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
          ).map(([id, text]) => (
            <button
              key={id}
              type="button"
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium",
                preset === id
                  ? "bg-teal-800 text-white"
                  : "bg-muted-bg text-foreground hover:bg-muted-bg",
              )}
              onClick={() => applyPreset(id)}
            >
              {text}
            </button>
          ))}
        </div>
        <div>
          <Label htmlFor="debt-from">From</Label>
          <Input
            id="debt-from"
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
          <Label htmlFor="debt-to">To</Label>
          <Input
            id="debt-to"
            type="date"
            value={to}
            onChange={(e) => {
              setPreset("range");
              setTo(e.target.value);
            }}
            className="mt-1 w-auto"
          />
        </div>
        {query.data ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void printPdf(query.data!, from, to)}
            >
              Print / PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => downloadCsv(query.data!)}
            >
              Export CSV
            </Button>
          </>
        ) : null}
      </div>

      {query.isLoading ? <LoadingBlock label="Loading unpaid invoices" /> : null}
      {query.isError ? (
        <ErrorState
          message="Could not load unpaid invoices."
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {t && p ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Tile label="Total owed now" value={formatCents(t.outstandingCents)} owe />
            <Tile label="Patients owing" value={String(t.patientsOwing)} />
            <Tile label="0–7 days" value={formatCents(t.aging.days0to7)} />
            <Tile label="8–30 days" value={formatCents(t.aging.days8to30)} />
            <Tile label="Over 30 days" value={formatCents(t.aging.days31plus)} />
            <Tile label="Unpaid invoices" value={String(t.outstandingCount)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Tile label="Billed (period)" value={formatCents(p.billedCents)} />
            <Tile label="Collected" value={formatCents(p.collectedCents)} />
            <Tile label="Debt collected" value={formatCents(p.debtCollectedCents)} />
            <Tile
              label={`Pay later · ${p.payLaterCount}`}
              value={formatCents(p.payLaterCents)}
            />
            <Tile
              label={`Waived / free · ${p.waivedCount}`}
              value={formatCents(p.waivedCents)}
            />
          </div>

          <ExpandablePanel
            title={
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Who owes
                </h2>
                <p className="text-xs text-muted">Oldest debt first</p>
              </div>
            }
            toolbar={
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, patient #, phone, invoice"
                className="max-w-sm"
              />
            }
          >
            {rows.length === 0 ? (
              <EmptyState
                title={search ? "No match" : "No one owes money"}
                description={
                  search ? undefined : "All invoices are paid, waived or void."
                }
              />
            ) : (
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell>Patient</DataTableHeaderCell>
                    <DataTableHeaderCell>Invoice</DataTableHeaderCell>
                    <DataTableHeaderCell>Age</DataTableHeaderCell>
                    <DataTableHeaderCell>Total</DataTableHeaderCell>
                    <DataTableHeaderCell>Paid</DataTableHeaderCell>
                    <DataTableHeaderCell>Waived</DataTableHeaderCell>
                    <DataTableHeaderCell>Owed</DataTableHeaderCell>
                    <DataTableHeaderCell>Reason / by</DataTableHeaderCell>
                    {onCollect ? (
                      <DataTableHeaderCell stickyRight>Action</DataTableHeaderCell>
                    ) : null}
                  </tr>
                </DataTableHead>
                <DataTableBody>
                  {rows.map((r) => (
                    <DataTableRow key={r.id}>
                      <DataTableCell>
                        <div className="font-medium text-foreground">
                          {receivablePatientName(r.patient)}
                        </div>
                        <div className="text-xs text-muted">
                          {r.patient.patientNumber}
                          {r.patient.phone ? ` · ${r.patient.phone}` : ""}
                        </div>
                      </DataTableCell>
                      <DataTableCell>
                        <div>{r.invoiceNumber}</div>
                        <div className="text-xs text-muted">
                          {format(new Date(r.issuedAt), "dd MMM yyyy")}
                        </div>
                      </DataTableCell>
                      <DataTableCell className="tabular-nums">
                        {r.ageDays} d
                      </DataTableCell>
                      <DataTableCell className="tabular-nums">
                        {formatCents(r.totalCents)}
                      </DataTableCell>
                      <DataTableCell className="tabular-nums">
                        {formatCents(r.paidCents)}
                      </DataTableCell>
                      <DataTableCell className="tabular-nums text-muted">
                        {r.waivedCents > 0 ? formatCents(r.waivedCents) : "-"}
                      </DataTableCell>
                      <DataTableCell className="tabular-nums font-semibold">
                        {formatCents(r.balanceCents)}
                      </DataTableCell>
                      <DataTableCell className="max-w-[16rem] whitespace-normal text-xs">
                        {r.atCashier ? (
                          <StatusBadge label="At cashier now" tone="amber" />
                        ) : (
                          <>
                            <div className="text-foreground">
                              {r.deferReason ?? "Part paid"}
                            </div>
                            {r.deferredBy ? (
                              <div className="text-muted">
                                {r.deferredBy.firstName} {r.deferredBy.lastName}
                              </div>
                            ) : null}
                          </>
                        )}
                      </DataTableCell>
                      {onCollect ? (
                        <DataTableCell stickyRight className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => onCollect(r)}
                          >
                            Collect / waive
                          </Button>
                        </DataTableCell>
                      ) : null}
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

function Tile({
  label: text,
  value,
  owe,
}: {
  label: string;
  value: string;
  owe?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-card px-3 py-2",
        owe && "border-amber-300 bg-amber-50",
      )}
    >
      <div className="text-2xs font-medium uppercase tracking-wide text-muted">
        {text}
      </div>
      <div
        className={cn(
          "mt-0.5 text-base font-semibold tabular-nums text-foreground",
          owe && "text-amber-950",
        )}
      >
        {value}
      </div>
    </div>
  );
}
