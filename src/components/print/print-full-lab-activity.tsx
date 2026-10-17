"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OverlayPortal } from "@/components/shared/overlay-portal";
import { LoadingBlock } from "@/components/shared/state-blocks";
import { fetchHmisReport } from "@/features/reports/hmis";
import { useWorkspaceContext } from "@/features/facilities/hooks";
import { cn } from "@/lib/utils";

type ReportSection = "summary" | "labActivity" | "statistics";

const SECTION_LABEL: Record<ReportSection, string> = {
  summary: "Out / In patient summary",
  labActivity: "Lab diagnostic activity table",
  statistics: "Statistics — range & recommend only",
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Aggregate Full Lab Report (Hiwet-style) from Laboratory — choose sections in a modal. */
export function PrintFullLabActivity() {
  const { facilityName } = useWorkspaceContext(null);
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(() =>
    new Date(new Date().setDate(1)).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [selected, setSelected] = useState<Record<ReportSection, boolean>>({
    summary: true,
    labActivity: true,
    statistics: true,
  });

  const query = useQuery({
    queryKey: ["reports", "hmis", "lab-print", from, to],
    queryFn: () =>
      fetchHmisReport(
        new Date(from).toISOString(),
        new Date(`${to}T23:59:59`).toISOString(),
      ),
    enabled: open && Boolean(from && to),
  });

  function toggle(key: ReportSection) {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function buildHtml() {
    const report = query.data;
    if (!report?.clinic) return "";
    const clinic = report.clinic;
    const name = facilityName || clinic.facility || "Hiwet Clinic";
    const fromLabel = format(new Date(report.period.from), "dd/MM/yyyy");
    const toLabel = format(new Date(report.period.to), "dd/MM/yyyy");

    let body = "";

    if (selected.summary) {
      body += `<div class="section">
        <p><strong>Out Patient:</strong> Male ${clinic.opd.M} Female ${clinic.opd.F} Total ${clinic.opd.total}</p>
        <p><strong>In Patient:</strong> Male ${clinic.ipd.M} Female ${clinic.ipd.F} Total ${clinic.ipd.total}</p>
      </div>`;
    }

    if (selected.labActivity) {
      const rows = clinic.labTests
        .map(
          (row, i) => `<tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(row.test)}</td>
            <td>${row.op_neg}</td>
            <td>${row.op_pos}</td>
            <td>${row.op_neg + row.op_pos}</td>
            <td>${row.ip_neg}</td>
            <td>${row.ip_pos}</td>
            <td>${row.ip_neg + row.ip_pos}</td>
          </tr>`,
        )
        .join("");
      body += `<div class="section">
        <h3>Diagnostic activities</h3>
        <table>
          <thead><tr>
            <th>S.N</th><th>Test</th>
            <th>OP -ve</th><th>OP +ve</th><th>Total</th>
            <th>IP -ve</th><th>IP +ve</th><th>Total</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    }

    if (selected.statistics) {
      const abnormal = clinic.labTests.reduce(
        (sum, row) => sum + row.op_pos + row.ip_pos,
        0,
      );
      const total = clinic.labTests.reduce(
        (sum, row) =>
          sum + row.op_neg + row.op_pos + row.ip_neg + row.ip_pos,
        0,
      );
      body += `<div class="section">
        <h3>Statistics — range &amp; recommend</h3>
        <table>
          <thead><tr><th>Indicator</th><th>Value</th><th>Recommend</th></tr></thead>
          <tbody>
            <tr><td>Total tests reported</td><td>${total}</td><td>Use reference ranges on individual result reports</td></tr>
            <tr><td>Positive / abnormal (proxy)</td><td>${abnormal}</td><td>Review flagged results clinically; recheck criticals</td></tr>
            <tr><td>Verified lab orders (period)</td><td>${report.labOrdersVerified}</td><td>Ensure every critical is notified to the ordering doctor</td></tr>
          </tbody>
        </table>
        <p class="note">Daily / weekly / monthly charts are omitted. Only range guidance and recommendations are printed.</p>
      </div>`;
    }

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>${escapeHtml(name)} — Full Lab Report</title>
<style>
  @page { margin: 14mm; }
  body { font-family: "Segoe UI", system-ui, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 12px; }
  .header { border-bottom: 2px solid #0f766e; padding-bottom: 10px; margin-bottom: 14px; }
  .brand { font-size: 18px; font-weight: 700; color: #0f766e; }
  .period { font-size: 12px; color: #334155; margin-top: 4px; }
  .section { margin-bottom: 16px; }
  .section h3 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #0f766e; }
  .section p { margin: 4px 0; }
  .section .note { color: #64748b; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; }
  th { background: #f1f5f9; }
  .footer { margin-top: 32px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .sig { border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 11px; color: #64748b; }
  .clinic { margin-top: 16px; font-size: 11px; color: #64748b; }
</style></head><body>
  <div class="header">
    <div class="brand">${escapeHtml(name.toUpperCase())} — Full Lab Report</div>
    <div class="period">Period: ${escapeHtml(fromLabel)} — ${escapeHtml(toLabel)}</div>
  </div>
  ${body}
  <div class="footer">
    <div class="sig">Reported By: ____________________</div>
    <div class="sig">Signature: ____________________</div>
  </div>
  <p class="clinic">Name of Health Center: ${escapeHtml(name)}</p>
</body></html>`;
  }

  function print() {
    if (!query.data?.clinic) return;
    if (!Object.values(selected).some(Boolean)) return;
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return;
    w.document.write(buildHtml());
    w.document.close();
    w.focus();
    w.print();
    setOpen(false);
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Print full report
      </Button>
      {open ? (
        <OverlayPortal>
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close"
              onClick={() => setOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 shadow-xl"
            >
              <h3 className="text-base font-semibold text-slate-900">
                Print full lab report
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                Choose the date range and sections, then print the Hiwet-style
                template.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="mb-1 block text-xs">From</Label>
                  <Input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-xs">To</Label>
                  <Input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Sections
                </p>
                {(Object.keys(SECTION_LABEL) as ReportSection[]).map((key) => (
                  <label
                    key={key}
                    className={cn(
                      "flex items-start gap-2 rounded border px-3 py-2 text-sm",
                      selected[key]
                        ? "border-teal-200 bg-teal-50/50"
                        : "border-slate-200",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={selected[key]}
                      onChange={() => toggle(key)}
                    />
                    <span>{SECTION_LABEL[key]}</span>
                  </label>
                ))}
              </div>

              {query.isLoading ? (
                <div className="mt-3">
                  <LoadingBlock label="Loading report data" />
                </div>
              ) : null}
              {query.isError ? (
                <p className="mt-3 text-xs text-red-700">
                  Could not load report data for this period.
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={
                    !query.data?.clinic ||
                    !Object.values(selected).some(Boolean) ||
                    query.isLoading
                  }
                  onClick={print}
                >
                  Print / PDF
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </OverlayPortal>
      ) : null}
    </>
  );
}
