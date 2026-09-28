"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { LoadingBlock, ErrorState } from "@/components/shared/state-blocks";
import {
  downloadBlob,
  downloadHmisXlsx,
  fetchHmisReport,
  hmisToCsv,
  type HmisReport,
} from "@/features/reports/hmis";

function HmisPrintBody({ report }: { report: HmisReport }) {
  return (
    <div className="space-y-4 text-sm text-slate-900">
      <h2 className="text-lg font-semibold">HMIS / Ministry report</h2>
      <p>{report.facility}</p>
      <p>
        Period: {format(new Date(report.period.from), "dd MMM yyyy")} —{" "}
        {format(new Date(report.period.to), "dd MMM yyyy")}
      </p>
      <table className="w-full border-collapse">
        <tbody>
          {[
            ["New patients", report.newPatients],
            ["Encounters", report.encounters],
            ["Lab verified", report.labOrdersVerified],
            ["Prescriptions", report.prescriptions],
            ["Appointments", report.appointmentsScheduled],
            ["Payments", report.paymentsCount],
            ["Revenue (ETB)", (report.paymentsTotalCents / 100).toFixed(2)],
          ].map(([label, value]) => (
            <tr key={String(label)} className="border-b border-slate-200">
              <td className="py-1 pr-4">{label}</td>
              <td className="py-1 font-medium tabular-nums">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HmisReportPanel() {
  const [from, setFrom] = useState(() =>
    new Date(new Date().setDate(1)).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const printRef = useRef<HTMLDivElement>(null);

  const query = useQuery({
    queryKey: ["reports", "hmis", from, to],
    queryFn: () =>
      fetchHmisReport(
        new Date(from).toISOString(),
        new Date(`${to}T23:59:59`).toISOString(),
      ),
    enabled: Boolean(from && to),
  });

  function exportCsv() {
    if (!query.data) return;
    const csv = hmisToCsv(query.data);
    downloadBlob(
      csv,
      `hmis-${from}-to-${to}.csv`,
      "text/csv;charset=utf-8",
    );
  }

  function exportExcel() {
    if (!query.data) return;
    void downloadHmisXlsx(query.data, from, to);
  }

  function exportPdf() {
    if (!printRef.current) return;
    const html = printRef.current.innerHTML;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<!DOCTYPE html><html><head><title>HMIS</title><style>body{font-family:system-ui,sans-serif;padding:24px}</style></head><body>${html}</body></html>`,
    );
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <Card className="space-y-4 p-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">HMIS / ministry</h2>
        <p className="text-xs text-slate-600">
          Period summary from the backend. Export .xlsx (ministry-style sheets),
          CSV, or print to PDF.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="hmis-from">From</Label>
          <Input
            id="hmis-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="hmis-to">To</Label>
          <Input
            id="hmis-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <Button type="button" variant="outline" onClick={() => void query.refetch()}>
          Refresh
        </Button>
        {query.data ? (
          <>
            <Button type="button" onClick={exportExcel}>
              Export .xlsx
            </Button>
            <Button type="button" variant="outline" onClick={exportCsv}>
              Export CSV
            </Button>
            <Button type="button" variant="secondary" onClick={exportPdf}>
              Print / PDF
            </Button>
          </>
        ) : null}
      </div>
      {query.isLoading ? <LoadingBlock label="Loading HMIS data" /> : null}
      {query.isError ? (
        <ErrorState
          message="HMIS report unavailable (admin or reporting officer role required)."
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.data ? (
        <>
          <div className="hidden" aria-hidden ref={printRef}>
            <HmisPrintBody report={query.data} />
          </div>
          <HmisPrintBody report={query.data} />
        </>
      ) : null}
    </Card>
  );
}
