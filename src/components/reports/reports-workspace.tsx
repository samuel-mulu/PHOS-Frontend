"use client";

import { useSearchParams } from "next/navigation";
import { QueryStaleBanner } from "@/components/shared/query-stale-banner";
import {
  EmptyState,
  ErrorState,
  LoadingBlock,
} from "@/components/shared/state-blocks";
import { Card } from "@/components/ui/card";
import { useOperationalSnapshot } from "@/features/reports/hooks";
import { Button } from "@/components/ui/button";
import { HmisReportPanel } from "@/components/reports/hmis-report-panel";
import { HmisClinicNav } from "@/components/reports/hmis-clinic-nav";
import { PaymentsReportPanel } from "@/components/payments/payments-report-panel";
import { ExpensesReportPanel } from "@/components/expenses/expenses-report-panel";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </Card>
  );
}

function Breakdown({
  title,
  data,
}: {
  title: string;
  data: Record<string, number>;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <ul className="mt-3 space-y-1 text-sm text-slate-700">
        {entries.map(([status, count]) => (
          <li key={status} className="flex justify-between gap-4">
            <span>{status.replaceAll("_", " ")}</span>
            <span className="font-medium tabular-nums">{count}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function downloadOperationalCsv(data: import("@/features/reports/api").OperationalSnapshot) {
  const lines = [
    "metric,value",
    `patientsTotal,${data.patientsTotal}`,
    `encountersTotal,${data.encountersTotal}`,
    `labOrdersTotal,${data.labOrdersTotal}`,
    `prescriptionsTotal,${data.prescriptionsTotal}`,
    `stockSkuCount,${data.stockSkuCount}`,
    `lowStockSkuCount,${data.lowStockSkuCount}`,
    `expiringBatchCount,${data.expiringBatchCount}`,
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `phos-operational-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsWorkspace() {
  const search = useSearchParams();
  const view = search.get("view");
  const isHfr = view === "hfr";
  const isFull = view === "full";
  const isPayments = view === "payments";
  const isExpenses = view === "expenses";
  const query = useOperationalSnapshot(isHfr);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-lg font-semibold text-slate-900">
            {isPayments
              ? "Cashier & front desk report"
              : isExpenses
                ? "Expense report"
                : isHfr
                ? "Health facility report"
                : "HMIS clinic report"}
          </h1>
          <p className="text-sm text-slate-600">
            {isPayments
              ? "Collections by day, month, or custom range - print PDF for records."
              : isExpenses
                ? "Outgoing expenses with clinic net (collections minus spend)."
                : isHfr
                ? "Operational counts for this facility (HFR)."
                : "Live aggregations from doctor diagnoses and lab results."}
          </p>
          <HmisClinicNav />
        </div>
        {isHfr && query.data ? (
          <Button type="button" variant="outline" onClick={() => downloadOperationalCsv(query.data!)}>
            Export CSV
          </Button>
        ) : null}
      </div>

      {isPayments ? (
        <PaymentsReportPanel
          showHeading={false}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        />
      ) : null}
      {isExpenses ? (
        <ExpensesReportPanel
          showHeading={false}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        />
      ) : null}
      {!isHfr && !isPayments && !isExpenses ? (
        <HmisReportPanel full={isFull} />
      ) : null}

      {isHfr ? <QueryStaleBanner query={query} /> : null}

      {isHfr && query.isLoading ? (
        <LoadingBlock label="Loading report data" />
      ) : null}
      {isHfr && query.isError ? (
        <ErrorState
          message="Could not load report data."
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {isHfr && query.isSuccess && query.data.encountersTotal === 0 ? (
        <EmptyState
          title="No activity yet"
          description="Counts will appear as patients, visits, and orders are recorded."
        />
      ) : null}

      {isHfr && query.isSuccess ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Patients (registered)" value={query.data.patientsTotal} />
            <StatCard label="Encounters" value={query.data.encountersTotal} />
            <StatCard label="Lab orders" value={query.data.labOrdersTotal} />
            <StatCard
              label="Prescriptions"
              value={query.data.prescriptionsTotal}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Stock SKUs" value={query.data.stockSkuCount} />
            <StatCard label="Low stock SKUs" value={query.data.lowStockSkuCount} />
            <StatCard
              label="Expiring batches (window)"
              value={query.data.expiringBatchCount}
            />
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <Breakdown title="Encounters by status" data={query.data.encountersByStatus} />
            <Breakdown title="Lab orders by status" data={query.data.labOrdersByStatus} />
            <Breakdown
              title="Prescriptions by status"
              data={query.data.prescriptionsByStatus}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
