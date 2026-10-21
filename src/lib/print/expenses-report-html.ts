import { format } from "date-fns";
import type { ExpenseReport } from "@/features/expenses/report";
import { formatCents } from "@/lib/format/money";
import { paymentMethodLabel } from "@/lib/format/payment-method";
import { HIWET_BRAND } from "@/lib/print/hiwet-brand";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildExpensesReportHtml(input: {
  report: ExpenseReport;
  fromLabel: string;
  toLabel: string;
  title?: string;
  logoUrl?: string | null;
  collectionsNetCents?: number | null;
}): string {
  const {
    report,
    fromLabel,
    toLabel,
    title = "Clinic expenses",
    logoUrl = null,
    collectionsNetCents = null,
  } = input;
  const { colors } = HIWET_BRAND;

  const logoHtml = logoUrl
    ? `<img class="logo" src="${logoUrl}" alt="Hiwet Clinic" />`
    : `<div class="logo-fallback">${escapeHtml(HIWET_BRAND.nameEn.charAt(0))}</div>`;

  const categoryRows = report.totals.byCategory
    .map(
      (c) =>
        `<tr><td>${escapeHtml(c.name)}</td><td class="num">${c.count}</td><td class="num">${escapeHtml(formatCents(c.amountCents))}</td></tr>`,
    )
    .join("");

  const detailRows = report.rows
    .filter((row) => row.status === "RECORDED")
    .map((row) => {
      const recorded = `${row.recordedBy.firstName} ${row.recordedBy.lastName}`;
      const note = [row.vendor, row.description].filter(Boolean).join(" · ");
      return `<tr>
        <td class="nowrap">${escapeHtml(format(new Date(`${row.expenseDate}T12:00:00`), "dd MMM yyyy"))}</td>
        <td>${escapeHtml(row.expenseNumber)}</td>
        <td>${escapeHtml(row.category.name)}</td>
        <td>${escapeHtml(paymentMethodLabel(row.method))}</td>
        <td class="num">${escapeHtml(formatCents(row.amountCents))}</td>
        <td>${escapeHtml(note || "-")}</td>
        <td>${escapeHtml(row.receiptReference ?? "-")}</td>
        <td>${escapeHtml(recorded)}</td>
      </tr>`;
    })
    .join("");

  const netTile =
    collectionsNetCents != null
      ? `<div class="tile net"><div class="label">Net (collections − expenses)</div><div class="val">${escapeHtml(formatCents(collectionsNetCents - report.totals.amountCents))}</div></div>`
      : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  body {
    font-family: "Segoe UI", system-ui, sans-serif;
    color: ${colors.ink};
    font-size: 10px;
    margin: 0;
    padding: 16px 18px;
  }
  .header {
    display: flex;
    align-items: center;
    gap: 14px;
    border-bottom: 2px solid ${colors.tealBorder};
    padding-bottom: 12px;
    margin-bottom: 14px;
  }
  .logo, .logo-fallback {
    width: 48px;
    height: 48px;
    border-radius: 999px;
    object-fit: cover;
    border: 2px solid ${colors.teal};
  }
  .logo-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ccfbf1;
    color: ${colors.teal};
    font-weight: 800;
    font-size: 18px;
  }
  h1 { margin: 0; font-size: 18px; color: ${colors.tealDark}; }
  .sub { margin: 4px 0 0; font-size: 11px; color: ${colors.muted}; }
  .summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 14px;
  }
  .tile {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 10px;
    background: #f8fafc;
  }
  .tile.net { border-color: ${colors.tealBorder}; background: #f0fdfa; }
  .tile .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: ${colors.muted}; }
  .tile .val { margin-top: 4px; font-size: 14px; font-weight: 700; }
  h2 { font-size: 12px; margin: 16px 0 6px; color: ${colors.tealDark}; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; font-weight: 700; font-size: 9px; text-transform: uppercase; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .nowrap { white-space: nowrap; }
  .footer {
    margin-top: 16px;
    padding-top: 10px;
    border-top: 1px solid ${colors.tealBorder};
    text-align: center;
    font-size: 9px;
    color: ${colors.muted};
  }
  @media print {
    .tile, th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style></head><body>
  <header class="header">
    ${logoHtml}
    <div>
      <h1>${escapeHtml(HIWET_BRAND.titleBilingual)}</h1>
      <p class="sub"><strong>${escapeHtml(title)}</strong> · ${escapeHtml(fromLabel)} – ${escapeHtml(toLabel)}</p>
      <p class="sub">Generated ${escapeHtml(format(new Date(), "dd MMM yyyy HH:mm"))}</p>
    </div>
  </header>

  <div class="summary">
    <div class="tile"><div class="label">Recorded</div><div class="val">${report.totals.count}</div></div>
    <div class="tile"><div class="label">Total spent</div><div class="val">${escapeHtml(formatCents(report.totals.amountCents))}</div></div>
    <div class="tile"><div class="label">Voided (excluded)</div><div class="val">${report.totals.voidedCount} · ${escapeHtml(formatCents(report.totals.voidedCents))}</div></div>
    ${collectionsNetCents != null ? `<div class="tile"><div class="label">Collections (net)</div><div class="val">${escapeHtml(formatCents(collectionsNetCents))}</div></div>` : `<div class="tile"></div>`}
  </div>
  ${netTile ? `<div class="summary">${netTile}</div>` : ""}

  ${categoryRows ? `<h2>By category</h2>
  <table><thead><tr><th>Category</th><th class="num">Count</th><th class="num">Amount</th></tr></thead><tbody>${categoryRows}</tbody></table>` : ""}

  <h2>Expense detail</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Expense #</th>
        <th>Category</th>
        <th>Method</th>
        <th class="num">Amount</th>
        <th>Vendor / note</th>
        <th>Receipt ref</th>
        <th>Recorded by</th>
      </tr>
    </thead>
    <tbody>
      ${detailRows || `<tr><td colspan="8">No expenses in this period.</td></tr>`}
    </tbody>
  </table>

  <footer class="footer">
    ${escapeHtml(HIWET_BRAND.footerAm)} · ${escapeHtml(HIWET_BRAND.phones)} · ${escapeHtml(HIWET_BRAND.locationEn)}
  </footer>
</body></html>`;
}
