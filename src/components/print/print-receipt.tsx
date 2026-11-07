"use client";

import { format } from "date-fns";
import { formatCents } from "@/lib/format/money";
import { paymentMethodLabel } from "@/lib/format/payment-method";
import { APP_NAME } from "@/lib/constants";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export type ReceiptData = {
  paymentNumber: string;
  invoiceNumber: string;
  patientName: string;
  amountCents: number;
  method: string;
  /** Invoice totals after this payment (optional for older callers). */
  totalCents?: number;
  paidSoFarCents?: number;
  waivedCents?: number;
  balanceCents?: number;
  /** Part of the balance approved as pay later. */
  payLaterCents?: number;
};

export function PrintReceipt({
  onPrint,
  ...r
}: ReceiptData & { onPrint?: () => void }) {
  const print = () => {
    const row = (label: string, value: string, cls = "") =>
      `<tr class="${cls}"><td>${escapeHtml(label)}</td><td class="num">${escapeHtml(value)}</td></tr>`;
    const summary =
      r.totalCents != null
        ? [
            row("Invoice total", formatCents(r.totalCents), "sep"),
            r.paidSoFarCents != null
              ? row("Paid so far", formatCents(r.paidSoFarCents))
              : "",
            r.waivedCents ? row("Waived (free)", formatCents(r.waivedCents)) : "",
            r.balanceCents != null
              ? row(
                  r.payLaterCents ? "Balance owed (pay later)" : "Balance",
                  formatCents(r.balanceCents),
                  r.balanceCents > 0 ? "owe" : "",
                )
              : "",
          ].join("")
        : "";
    const html = `
<!DOCTYPE html><html><head><title>Receipt ${escapeHtml(r.paymentNumber)}</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 24px; max-width: 320px; margin: 0 auto; }
  h1 { font-size: 16px; margin: 0 0 8px; }
  .muted { color: #555; font-size: 12px; }
  table { width: 100%; margin-top: 16px; font-size: 14px; border-collapse: collapse; }
  td { padding: 4px 0; }
  td.num { text-align: right; }
  .total td { font-weight: bold; font-size: 16px; border-top: 1px solid #ccc; padding-top: 8px; }
  .sep td { border-top: 1px dashed #bbb; padding-top: 8px; }
  .owe td { font-weight: bold; }
</style></head><body>
  <h1>${escapeHtml(APP_NAME)}</h1>
  <p class="muted">Payment receipt</p>
  <table>
    ${row("Receipt", r.paymentNumber)}
    ${row("Invoice", r.invoiceNumber)}
    ${row("Patient", r.patientName)}
    ${row("Method", paymentMethodLabel(r.method))}
    ${row("Date", format(new Date(), "dd MMM yyyy HH:mm"))}
    ${row("Paid now", formatCents(r.amountCents), "total")}
    ${summary}
  </table>
  <p class="muted" style="margin-top:24px">Thank you.</p>
</body></html>`;
    const w = window.open("", "_blank", "width=400,height=560");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
    onPrint?.();
  };

  return (
    <button
      type="button"
      className="text-sm font-medium text-teal-800 underline dark:text-teal-300"
      onClick={print}
    >
      Print receipt
    </button>
  );
}
