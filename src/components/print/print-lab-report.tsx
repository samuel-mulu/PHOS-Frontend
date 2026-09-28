"use client";

import { format } from "date-fns";
import { APP_NAME } from "@/lib/constants";
import type { LabOrder } from "@/features/laboratory/api";

export function PrintLabReport({ order }: { order: LabOrder }) {
  const print = () => {
    const patient = order.patient;
    const name = `${patient.firstName} ${patient.lastName}`;
    const rows = order.items
      .map(
        (item) =>
          `<tr><td>${item.labTest.name}</td><td>${item.result?.value ?? "—"}</td><td>${item.result?.unit ?? item.labTest.unit ?? ""}</td><td>${item.result?.referenceRange ?? item.labTest.referenceRange ?? ""}</td></tr>`,
      )
      .join("");
    const html = `<!DOCTYPE html><html><head><title>Lab ${order.orderNumber}</title>
<style>
body { font-family: system-ui, sans-serif; padding: 24px; }
h1 { font-size: 18px; } table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
th { background: #f4f4f4; }
</style></head><body>
<h1>${APP_NAME} — Laboratory report</h1>
<p><strong>Order:</strong> ${order.orderNumber} · <strong>Status:</strong> ${order.status}</p>
<p><strong>Patient:</strong> ${name} (${patient.patientNumber})</p>
<p><strong>Printed:</strong> ${format(new Date(), "dd MMM yyyy HH:mm")}</p>
<table><thead><tr><th>Test</th><th>Result</th><th>Unit</th><th>Reference</th></tr></thead><tbody>${rows}</tbody></table>
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
