"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OverlayPortal } from "@/components/shared/overlay-portal";
import {
  EmptyState,
  ErrorState,
  LoadingBlock,
} from "@/components/shared/state-blocks";
import {
  fetchPatientLabOrders,
  type LabOrder,
} from "@/features/laboratory/api";
import { usePatientsList } from "@/features/patients/hooks";
import { useWorkspaceContext } from "@/features/facilities/hooks";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { ageYears } from "@/lib/format/age";
import { groupByPanel, panelLabel } from "@/lib/lab/panels";
import { cn } from "@/lib/utils";
import type { Patient } from "@/types/patient";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function recommendForFlag(flag: string | null | undefined): string {
  if (!flag) return "-";
  switch (flag) {
    case "LOW":
      return "Below reference - review clinically";
    case "HIGH":
      return "Above reference - review clinically";
    case "CRITICAL":
      return "Critical - urgent clinical review";
    case "ABNORMAL":
      return "Abnormal - correlate with history";
    case "NORMAL":
      return "Within reference range";
    default:
      return flag.replaceAll("_", " ");
  }
}

function patientFullName(p: Patient) {
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ");
}

function orderSectionHtml(order: LabOrder, includeStats: boolean): string {
  const panels = groupByPanel(
    order.items,
    (item) => item.labTest.category,
    (item) => item.labTest.sortOrder,
  );
  const doctor = order.doctor
    ? `Dr. ${order.doctor.firstName} ${order.doctor.lastName}`
    : "-";
  const when = format(new Date(order.createdAt), "dd MMM yyyy HH:mm");

  const tables = panels
    .map((group) => {
      const rows = group.items
        .map((item) => {
          const value = item.result?.value ?? "-";
          const flag = item.result?.flag ?? "";
          const unit = item.result?.unit ?? item.labTest.unit ?? "";
          const range =
            item.result?.referenceRange ?? item.labTest.referenceRange ?? "-";
          const recommend = includeStats
            ? recommendForFlag(item.result?.flag) +
              (item.result?.notes?.trim()
                ? ` · ${item.result.notes.trim()}`
                : "")
            : "-";
          return `<tr>
            <td>${escapeHtml(item.labTest.name)}</td>
            <td>${escapeHtml(String(value))}${flag ? ` <span class="flag">${escapeHtml(flag)}</span>` : ""}</td>
            <td>${escapeHtml(unit)}</td>
            <td>${escapeHtml(range)}</td>
            ${includeStats ? `<td>${escapeHtml(recommend)}</td>` : ""}
          </tr>`;
        })
        .join("");
      return `<div class="panel">
        <h4>${escapeHtml(group.title || panelLabel(group.category))}</h4>
        <table>
          <thead><tr>
            <th>Test</th><th>Result</th><th>Unit</th><th>Range</th>
            ${includeStats ? "<th>Recommend</th>" : ""}
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    })
    .join("");

  return `<section class="order">
    <div class="order-head">
      <div>
        <span class="badge">${escapeHtml(order.orderNumber)}</span>
        <span class="muted">${escapeHtml(when)}</span>
      </div>
      <div class="muted">Ordered by ${escapeHtml(doctor)} · ${escapeHtml(order.priority)} · ${escapeHtml(order.status.replaceAll("_", " "))}</div>
    </div>
    ${tables || `<p class="note">No tests on this order.</p>`}
  </section>`;
}

export function PrintPatientLabReport({
  patientId: initialPatientId,
  patientLabel,
  triggerLabel = "Patient lab report",
  variant = "outline",
  size = "sm",
}: {
  /** When set (e.g. patient profile), skip search and load this patient. */
  patientId?: string;
  patientLabel?: string;
  triggerLabel?: string;
  variant?: "outline" | "default" | "secondary";
  size?: "sm" | "default";
}) {
  const { facilityName } = useWorkspaceContext(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 350);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [from, setFrom] = useState(() =>
    new Date(new Date().setMonth(new Date().getMonth() - 3))
      .toISOString()
      .slice(0, 10),
  );
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [includeStats, setIncludeStats] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState<Record<string, boolean>>(
    {},
  );

  const patientId = selectedPatient?.id ?? initialPatientId;

  const patientsQuery = usePatientsList({
    search: debounced || undefined,
    page: 1,
    limit: 8,
  });

  const reportQuery = useQuery({
    queryKey: ["lab", "patient-report", patientId, from, to],
    queryFn: () => fetchPatientLabOrders(patientId!, from, to),
    enabled: open && Boolean(patientId) && Boolean(from && to),
  });

  const orders = reportQuery.data?.orders ?? [];
  const patient = reportQuery.data?.patient ?? selectedPatient;

  useEffect(() => {
    if (!reportQuery.data) return;
    setSelectedOrders(
      Object.fromEntries(reportQuery.data.orders.map((o) => [o.id, true])),
    );
    if (!selectedPatient && reportQuery.data.patient) {
      setSelectedPatient(reportQuery.data.patient);
    }
  }, [reportQuery.data, selectedPatient]);

  const chosenOrders = useMemo(
    () => orders.filter((o) => selectedOrders[o.id] !== false),
    [orders, selectedOrders],
  );

  function pickPatient(p: Patient) {
    setSelectedPatient(p);
    setSearch("");
  }

  function buildHtml() {
    if (!patient || chosenOrders.length === 0) return "";
    const clinic = facilityName || "Hiwet Clinic";
    const name = patientFullName(patient);
    const age = ageYears(patient.dateOfBirth);
    const dateStr = format(new Date(), "dd MMMM yyyy");
    const period = `${format(new Date(from), "dd/MM/yyyy")} - ${format(new Date(to), "dd/MM/yyyy")}`;
    const body = chosenOrders
      .map((o) => orderSectionHtml(o, includeStats))
      .join("");

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>${escapeHtml(clinic)} - Patient Lab Report</title>
<style>
  @page { margin: 14mm; }
  body { font-family: "Segoe UI", system-ui, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 12px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f766e; padding-bottom: 10px; margin-bottom: 14px; }
  .brand { font-size: 20px; font-weight: 700; color: #0f766e; }
  .sub { font-size: 11px; color: #64748b; margin-top: 2px; }
  .meta { text-align: right; font-size: 12px; color: #334155; }
  .summary { border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 14px; background: #f8fafc; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; margin-bottom: 16px; }
  .summary strong { color: #0f766e; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; }
  .order { margin-bottom: 18px; page-break-inside: avoid; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; }
  .order-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
  .badge { display: inline-block; background: #0f766e; color: #fff; border-radius: 999px; padding: 2px 8px; font-size: 10px; font-weight: 700; margin-right: 8px; }
  .muted { font-size: 11px; color: #64748b; }
  .panel { margin-top: 8px; }
  .panel h4 { margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #0f766e; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; font-weight: 600; color: #334155; }
  .flag { font-size: 10px; font-weight: 700; color: #b45309; }
  .note { color: #64748b; font-size: 11px; }
  .footer { margin-top: 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
  .sig { border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 11px; color: #64748b; }
  .clinic-line { margin-top: 18px; font-size: 11px; color: #64748b; text-align: center; }
</style></head><body>
  <div class="header">
    <div>
      <div class="brand">${escapeHtml(clinic.toUpperCase())} - Patient Lab Report</div>
      <div class="sub">All selected lab results for one patient</div>
    </div>
    <div class="meta">${escapeHtml(dateStr)}<br/>Period: ${escapeHtml(period)}</div>
  </div>
  <div class="summary">
    <div><strong>Patient</strong><br/>${escapeHtml(name)}</div>
    <div><strong>Patient ID</strong><br/>${escapeHtml(patient.patientNumber)}</div>
    <div><strong>Sex / Age</strong><br/>${escapeHtml(patient.sex.replaceAll("_", " "))} · ${age != null ? age : "-"}</div>
    <div><strong>Orders printed</strong><br/>${chosenOrders.length}</div>
  </div>
  ${body}
  <div class="footer">
    <div class="sig">Reported by: ____________________</div>
    <div class="sig">Signature: ____________________</div>
  </div>
  <p class="clinic-line">Name of Health Center: ${escapeHtml(clinic)}</p>
</body></html>`;
  }

  function print() {
    if (chosenOrders.length === 0) return;
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return;
    w.document.write(buildHtml());
    w.document.close();
    w.focus();
    w.print();
    setOpen(false);
  }

  const showSearch = !initialPatientId;

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
      >
        <FileText className="h-4 w-4" aria-hidden />
        {triggerLabel}
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
              aria-labelledby="patient-lab-report-title"
              className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 shadow-xl"
            >
              <h3
                id="patient-lab-report-title"
                className="text-base font-semibold text-slate-900"
              >
                Patient lab report
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                Select a patient and date range, then print their lab results in
                one report.
              </p>

              {showSearch ? (
                <div className="mt-4 space-y-2">
                  <Label className="text-xs">Find patient</Label>
                  {selectedPatient ? (
                    <div className="flex items-center justify-between gap-2 rounded-md border border-teal-200 bg-teal-50/60 px-3 py-2 text-sm">
                      <span className="font-medium text-slate-900">
                        {patientFullName(selectedPatient)}
                        <span className="ml-2 text-xs text-slate-500">
                          {selectedPatient.patientNumber}
                        </span>
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedPatient(null)}
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search
                          className="pointer-events-none absolute top-2.5 left-2.5 h-4 w-4 text-slate-400"
                          aria-hidden
                        />
                        <Input
                          className="pl-8"
                          placeholder="Name or patient number…"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                      {debounced ? (
                        patientsQuery.isLoading ? (
                          <LoadingBlock label="Searching" />
                        ) : patientsQuery.isError ? (
                          <ErrorState
                            message="Could not search patients."
                            onRetry={() => void patientsQuery.refetch()}
                          />
                        ) : (patientsQuery.data?.items.length ?? 0) === 0 ? (
                          <EmptyState
                            title="No matches"
                            description="Try another name or ID."
                          />
                        ) : (
                          <ul className="max-h-40 overflow-y-auto rounded-md border border-slate-200">
                            {patientsQuery.data?.items.map((p) => (
                              <li key={p.id}>
                                <button
                                  type="button"
                                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                                  onClick={() => pickPatient(p)}
                                >
                                  <span className="font-medium text-slate-900">
                                    {patientFullName(p)}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    {p.patientNumber}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )
                      ) : null}
                    </>
                  )}
                </div>
              ) : (
                <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                  {patientLabel ||
                    (patient ? patientFullName(patient) : "This patient")}
                </p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3">
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

              <label className="mt-3 flex items-center gap-2 text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={includeStats}
                  onChange={() => setIncludeStats((v) => !v)}
                />
                Include range recommendations
              </label>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Lab orders
                  </p>
                  {orders.length > 0 ? (
                    <div className="flex gap-2 text-[11px]">
                      <button
                        type="button"
                        className="text-teal-700 underline"
                        onClick={() =>
                          setSelectedOrders(
                            Object.fromEntries(orders.map((o) => [o.id, true])),
                          )
                        }
                      >
                        All
                      </button>
                      <button
                        type="button"
                        className="text-slate-500 underline"
                        onClick={() =>
                          setSelectedOrders(
                            Object.fromEntries(
                              orders.map((o) => [o.id, false]),
                            ),
                          )
                        }
                      >
                        None
                      </button>
                    </div>
                  ) : null}
                </div>

                {!patientId ? (
                  <p className="text-xs text-slate-500">
                    Select a patient to load orders.
                  </p>
                ) : reportQuery.isLoading ? (
                  <LoadingBlock label="Loading lab orders" />
                ) : reportQuery.isError ? (
                  <ErrorState
                    message="Could not load lab orders."
                    onRetry={() => void reportQuery.refetch()}
                  />
                ) : orders.length === 0 ? (
                  <EmptyState
                    title="No printable results"
                    description="No entered or verified lab orders in this period."
                  />
                ) : (
                  <ul className="max-h-52 space-y-1.5 overflow-y-auto">
                    {orders.map((o) => (
                      <li key={o.id}>
                        <label
                          className={cn(
                            "flex cursor-pointer items-start gap-2 rounded border px-3 py-2 text-sm",
                            selectedOrders[o.id] !== false
                              ? "border-teal-200 bg-teal-50/50"
                              : "border-slate-200",
                          )}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={selectedOrders[o.id] !== false}
                            onChange={() =>
                              setSelectedOrders((prev) => ({
                                ...prev,
                                [o.id]: !(prev[o.id] !== false),
                              }))
                            }
                          />
                          <span className="min-w-0">
                            <span className="font-medium text-slate-900">
                              {o.orderNumber}
                            </span>
                            <span className="mt-0.5 block text-xs text-slate-500">
                              {format(new Date(o.createdAt), "dd MMM yyyy")} ·{" "}
                              {o.status.replaceAll("_", " ")} ·{" "}
                              {o.items.length} test
                              {o.items.length === 1 ? "" : "s"}
                            </span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={chosenOrders.length === 0 || reportQuery.isLoading}
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
