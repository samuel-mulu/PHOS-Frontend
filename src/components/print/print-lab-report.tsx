"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { OverlayPortal } from "@/components/shared/overlay-portal";
import { useEncounter } from "@/features/encounters/hooks";
import type { LabOrder } from "@/features/laboratory/api";
import { useWorkspaceContext } from "@/features/facilities/hooks";
import { ageYears } from "@/lib/format/age";
import { cn } from "@/lib/utils";
import { groupByPanel, panelLabel } from "@/lib/lab/panels";
import { LabOrderStatus } from "@/types/lab";

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

function triageLines(triage: Record<string, unknown> | null): string[] {
  if (!triage) return [];
  const lines: string[] = [];
  if (triage.temperature != null)
    lines.push(`Temp: ${String(triage.temperature)} °C`);
  if (triage.systolic != null || triage.diastolic != null)
    lines.push(
      `BP: ${String(triage.systolic ?? "-")}/${String(triage.diastolic ?? "-")}`,
    );
  if (triage.heartRate != null)
    lines.push(`Pulse: ${String(triage.heartRate)}`);
  if (triage.spo2 != null) lines.push(`SpO2: ${String(triage.spo2)}%`);
  if (triage.bloodGlucoseMgDl != null)
    lines.push(`Glucose: ${String(triage.bloodGlucoseMgDl)} mg/dL`);
  if (triage.notes) lines.push(`Notes: ${String(triage.notes)}`);
  return lines;
}

const PRINTABLE = new Set<string>([
  LabOrderStatus.RESULT_ENTERED,
  LabOrderStatus.VERIFIED,
]);

export function PrintLabReport({ order }: { order: LabOrder }) {
  const { facilityName } = useWorkspaceContext(null);
  const [open, setOpen] = useState(false);
  const [includeVitals, setIncludeVitals] = useState(true);
  const [includeStats, setIncludeStats] = useState(true);
  const encounter = useEncounter(order.encounterId);

  const panels = useMemo(
    () =>
      groupByPanel(
        order.items,
        (item) => item.labTest.category,
        (item) => item.labTest.sortOrder,
      ),
    [order.items],
  );

  const [selectedPanels, setSelectedPanels] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(panels.map((p) => [p.category, true])) as Record<
        string,
        boolean
      >,
  );

  if (!PRINTABLE.has(order.status)) return null;

  function togglePanel(category: string) {
    setSelectedPanels((prev) => ({ ...prev, [category]: !prev[category] }));
  }

  function selectAllPanels(on: boolean) {
    setSelectedPanels(
      Object.fromEntries(panels.map((p) => [p.category, on])) as Record<
        string,
        boolean
      >,
    );
  }

  function buildHtml() {
    const patient = order.patient;
    const name = [patient.firstName, patient.middleName, patient.lastName]
      .filter(Boolean)
      .join(" ");
    const age = ageYears(patient.dateOfBirth);
    const clinic = facilityName || "Hiwet Clinic";
    const dateStr = format(new Date(), "dd MMMM yyyy");
    const doctor = order.doctor
      ? `Dr. ${order.doctor.firstName} ${order.doctor.lastName}`
      : "";
    const enc = encounter.data;
    const vitalsFromTriage = triageLines(enc?.triage ?? null);
    const vitalsFromDoctor = enc?.consultation?.physicalExam?.trim() ?? "";

    const chosen = panels.filter((p) => selectedPanels[p.category] !== false);

    let vitalsBlock = "";
    if (includeVitals) {
      const body =
        [
          ...vitalsFromTriage,
          vitalsFromDoctor ? `Doctor vitals / exam:\n${vitalsFromDoctor}` : "",
        ]
          .filter(Boolean)
          .join("\n") || "-";
      vitalsBlock = `<div class="section"><h3>Doctor vitals</h3><pre>${escapeHtml(body)}</pre></div>`;
    }

    const labTables = chosen
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
        return `<div class="section">
          <h3>${escapeHtml(group.title || panelLabel(group.category))}</h3>
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

    const statsNote = includeStats
      ? `<div class="section"><h3>Statistics - range &amp; recommend</h3>
         <p class="note">Reference ranges are shown per test. Recommendations follow result flags (Normal / Low / High / Critical). Correlate with clinical findings.</p>
       </div>`
      : "";

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>${escapeHtml(clinic)} - Full Lab Report</title>
<style>
  @page { margin: 14mm; }
  body { font-family: "Segoe UI", system-ui, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 12px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f766e; padding-bottom: 10px; margin-bottom: 14px; }
  .brand { font-size: 20px; font-weight: 700; color: #0f766e; letter-spacing: 0.02em; }
  .sub { font-size: 11px; color: #64748b; margin-top: 2px; }
  .meta { text-align: right; font-size: 12px; color: #334155; }
  .badge { display: inline-block; background: #0f766e; color: #fff; border-radius: 999px; padding: 2px 8px; font-size: 10px; font-weight: 700; margin-top: 4px; }
  .summary { border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 14px; background: #f8fafc; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 20px; margin-bottom: 16px; }
  .summary strong { color: #0f766e; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; }
  .section { margin-bottom: 14px; }
  .section h3 { margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #0f766e; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; }
  .section pre { margin: 0; white-space: pre-wrap; font-family: inherit; font-size: 12px; line-height: 1.4; }
  .section .note { margin: 0; color: #475569; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; font-weight: 600; color: #334155; }
  .flag { font-size: 10px; font-weight: 700; color: #b45309; }
  .footer { margin-top: 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
  .sig { border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 11px; color: #64748b; }
  .clinic-line { margin-top: 18px; font-size: 11px; color: #64748b; text-align: center; }
</style></head><body>
  <div class="header">
    <div>
      <div class="brand">${escapeHtml(clinic.toUpperCase())} - Full Lab Report</div>
      <div class="sub">Laboratory diagnostic report</div>
    </div>
    <div class="meta">
      ${escapeHtml(dateStr)}<br/>
      <span class="badge">${escapeHtml(order.orderNumber)}</span>
    </div>
  </div>
  <div class="summary">
    <div><strong>Patient</strong><br/>${escapeHtml(name)}</div>
    <div><strong>Patient ID</strong><br/>${escapeHtml(patient.patientNumber)}</div>
    <div><strong>Sex / Age</strong><br/>${escapeHtml(patient.sex.replaceAll("_", " "))} · ${age != null ? age : "-"}</div>
    <div><strong>Ordered by</strong><br/>${escapeHtml(doctor || "-")}</div>
    <div><strong>Priority</strong><br/>${escapeHtml(order.priority)}</div>
    <div><strong>Status</strong><br/>${escapeHtml(order.status.replaceAll("_", " "))}</div>
  </div>
  ${vitalsBlock}
  ${labTables || `<div class="section"><p class="note">No lab panels selected.</p></div>`}
  ${statsNote}
  <div class="footer">
    <div class="sig">Reported by: ____________________</div>
    <div class="sig">Signature: ____________________</div>
  </div>
  <p class="clinic-line">Name of Health Center: ${escapeHtml(clinic)}</p>
</body></html>`;
  }

  function print() {
    const anyPanel = panels.some((p) => selectedPanels[p.category] !== false);
    if (!includeVitals && !anyPanel) return;
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return;
    w.document.write(buildHtml());
    w.document.close();
    w.focus();
    w.print();
    setOpen(false);
  }

  const canPrint =
    includeVitals ||
    panels.some((p) => selectedPanels[p.category] !== false);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
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
              aria-labelledby="print-lab-title"
              className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 shadow-xl"
            >
              <h3
                id="print-lab-title"
                className="text-base font-semibold text-slate-900"
              >
                Print full lab report
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                Check sections to include - same idea as the doctor visit note.
                Template uses range and recommend for statistics.
              </p>

              <div className="mt-4 space-y-3">
                <label className="flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={includeVitals}
                    onChange={() => setIncludeVitals((v) => !v)}
                  />
                  Doctor vitals
                  {encounter.isLoading ? (
                    <span className="text-[11px] text-slate-400">
                      (loading…)
                    </span>
                  ) : null}
                </label>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Lab panels
                    </p>
                    <div className="flex gap-2 text-[11px]">
                      <button
                        type="button"
                        className="text-teal-700 underline"
                        onClick={() => selectAllPanels(true)}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        className="text-slate-500 underline"
                        onClick={() => selectAllPanels(false)}
                      >
                        None
                      </button>
                    </div>
                  </div>
                  <p className="mb-2 text-[11px] text-slate-500">
                    Tap a panel to include or exclude it from the report.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {panels.map((panel) => {
                      const on = selectedPanels[panel.category] !== false;
                      return (
                        <button
                          key={panel.category}
                          type="button"
                          aria-pressed={on}
                          onClick={() => togglePanel(panel.category)}
                          className={cn(
                            "rounded border px-2.5 py-1 text-xs font-medium transition-colors",
                            on
                              ? "border-teal-700 bg-teal-700 text-white"
                              : "border-slate-300 bg-white text-slate-800 hover:border-teal-600",
                          )}
                        >
                          {panel.label}
                          <span className="opacity-80">
                            {" "}
                            ({panel.items.length})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="flex items-start gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={includeStats}
                    onChange={() => setIncludeStats((v) => !v)}
                  />
                  <span>
                    Statistics - range &amp; recommend
                    <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                      Adds reference range and clinical recommend columns (not
                      daily/weekly charts).
                    </span>
                  </span>
                </label>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button type="button" disabled={!canPrint} onClick={print}>
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
