"use client";

import { format } from "date-fns";
import { APP_NAME } from "@/lib/constants";
import type { LabOrder } from "@/features/laboratory/api";
import { groupByPanel } from "@/lib/lab/panels";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function PrintLabReport({ order }: { order: LabOrder }) {
  const print = () => {
    const patient = order.patient;
    const name = `${patient.firstName} ${patient.lastName}`;
    const groups = groupByPanel(
      order.items,
      (item) => item.labTest.category,
      (item) => item.labTest.sortOrder,
    );
    const sections = groups
      .map((group) => {
        const rows = group.items
          .map((item) => {
            const flag = item.result?.flag ? ` ${item.result.flag}` : "";
            return `<tr><td>${escapeHtml(item.labTest.name)}</td><td>${escapeHtml((item.result?.value ?? "—") + flag)}</td><td>${escapeHtml(item.result?.unit ?? item.labTest.unit ?? "")}</td><td>${escapeHtml(item.result?.referenceRange ?? item.labTest.referenceRange ?? "")}</td></tr>`;
          })
          .join("");
        return `<h2>${escapeHtml(group.title)}</h2><table><thead><tr><th>Test</th><th>Result</th><th>Unit</th><th>Reference</th></tr></thead><tbody>${rows}</tbody></table>`;
      })
      .join("");
    const html = `<!DOCTYPE html><html><head><title>Lab ${escapeHtml(order.orderNumber)}</title>
<style>
body { font-family: ui-monospace, Consolas, system-ui, sans-serif; padding: 24px; }
h1 { font-size: 18px; } h2 { font-size: 12px; margin: 18px 0 6px; letter-spacing: 0.04em; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
th { background: #f4f4f4; }
</style></head><body>
<h1>${APP_NAME} — Laboratory report</h1>
<p><strong>Order:</strong> ${escapeHtml(order.orderNumber)} · <strong>Status:</strong> ${escapeHtml(order.status)}</p>
<p><strong>Patient:</strong> ${escapeHtml(name)} (${escapeHtml(patient.patientNumber)})</p>
<p><strong>Printed:</strong> ${format(new Date(), "dd MMM yyyy HH:mm")}</p>
${sections}
</body></html>`;
    const w = window.open("", "_blank", "width=720,height=640");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  if (order.status !== "VERIFIED") return null;

  return (
    <button
      type="button"
      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium"
      onClick={print}
    >
      Print lab report
    </button>
  );
}
