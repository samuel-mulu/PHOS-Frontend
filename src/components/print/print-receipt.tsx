"use client";

import { format } from "date-fns";
import { formatCents } from "@/lib/format/money";
import { APP_NAME } from "@/lib/constants";

export function PrintReceipt({
  paymentNumber,
  invoiceNumber,
  patientName,
  amountCents,
  method,
  onPrint,
}: {
  paymentNumber: string;
  invoiceNumber: string;
  patientName: string;
  amountCents: number;
  method: string;
  onPrint?: () => void;
}) {
  const print = () => {
    const html = `
<!DOCTYPE html><html><head><title>Receipt ${paymentNumber}</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 24px; max-width: 320px; margin: 0 auto; }
  h1 { font-size: 16px; margin: 0 0 8px; }
  .muted { color: #555; font-size: 12px; }
  table { width: 100%; margin-top: 16px; font-size: 14px; }
  td { padding: 4px 0; }
  .total { font-weight: bold; font-size: 16px; border-top: 1px solid #ccc; padding-top: 8px; }
</style></head><body>
  <h1>${APP_NAME}</h1>
  <p class="muted">Payment receipt</p>
  <table>
    <tr><td>Receipt</td><td>${paymentNumber}</td></tr>
    <tr><td>Invoice</td><td>${invoiceNumber}</td></tr>
    <tr><td>Patient</td><td>${patientName}</td></tr>
    <tr><td>Method</td><td>${method}</td></tr>
    <tr><td>Date</td><td>${format(new Date(), "dd MMM yyyy HH:mm")}</td></tr>
    <tr class="total"><td>Amount</td><td>${formatCents(amountCents)}</td></tr>
  </table>
  <p class="muted" style="margin-top:24px">Thank you.</p>
</body></html>`;
    const w = window.open("", "_blank", "width=400,height=520");
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
      className="text-sm font-medium text-teal-800 underline"
      onClick={print}
    >
      Print receipt
    </button>
  );
}
