import { format } from "date-fns";
import {
  receivablePatientName,
  type ReceivablesReport,
} from "@/features/payments/receivables";
import { formatCents } from "@/lib/format/money";
import { HIWET_BRAND } from "@/lib/print/hiwet-brand";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const money = (cents: number) => escapeHtml(formatCents(cents));

/** A4 landscape print of unpaid invoices / patient debts. */
export function buildReceivablesReportHtml(input: {
  report: ReceivablesReport;
  fromLabel: string;
  toLabel: string;
  logoUrl?: string | null;
}): string {
  const { report, fromLabel, toLabel, logoUrl = null } = input;
  const { colors } = HIWET_BRAND;
  const t = report.totals;
  const p = report.periodTotals;
  const title = "Unpaid & debts";

  const logoHtml = logoUrl
    ? `<img class="logo" src="${logoUrl}" alt="Hiwet Clinic" />`
    : `<div class="logo-fallback">${escapeHtml(HIWET_BRAND.nameEn.charAt(0))}</div>`;

  const rows = report.rows
    .map((r) => {
      const by = r.deferredBy
        ? `${r.deferredBy.firstName} ${r.deferredBy.lastName}`
        : "";
      return `<tr>
        <td class="nowrap">${escapeHtml(format(new Date(r.issuedAt), "dd MMM yyyy"))}</td>
        <td class="num">${r.ageDays}</td>
        <td>${escapeHtml(r.invoiceNumber)}</td>
        <td>${escapeHtml(r.patient.patientNumber)}</td>
        <td>${escapeHtml(receivablePatientName(r.patient))}${r.patient.phone ? `<br/><span class="muted">${escapeHtml(r.patient.phone)}</span>` : ""}</td>
        <td class="num">${money(r.totalCents)}</td>
        <td class="num">${money(r.paidCents)}</td>
        <td class="num">${r.waivedCents > 0 ? money(r.waivedCents) : "-"}</td>
        <td class="num"><strong>${money(r.balanceCents)}</strong></td>
        <td>${escapeHtml(r.atCashier ? "At cashier now" : r.deferReason ?? "")}</td>
        <td>${escapeHtml(by)}</td>
      </tr>`;
    })
    .join("");

  const tile = (label: string, value: string, cls = "") =>
    `<div class="tile ${cls}"><div class="label">${escapeHtml(label)}</div><div class="val">${value}</div></div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  body { font-family: "Segoe UI", system-ui, sans-serif; color: ${colors.ink}; font-size: 10px; margin: 0; padding: 16px 18px; }
  .header { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid ${colors.tealBorder}; padding-bottom: 12px; margin-bottom: 14px; }
  .logo, .logo-fallback { width: 48px; height: 48px; border-radius: 999px; object-fit: cover; border: 2px solid ${colors.teal}; }
  .logo-fallback { display: flex; align-items: center; justify-content: center; background: #ccfbf1; color: ${colors.teal}; font-weight: 800; font-size: 18px; }
  h1 { margin: 0; font-size: 18px; color: ${colors.tealDark}; }
  .sub { margin: 4px 0 0; font-size: 11px; color: ${colors.muted}; }
  .muted { color: ${colors.muted}; }
  .summary { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 10px; }
  .tile { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; background: #f8fafc; }
  .tile.owe { border-color: #fcd34d; background: #fffbeb; }
  .tile .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: ${colors.muted}; }
  .tile .val { margin-top: 4px; font-size: 14px; font-weight: 700; }
  h2 { font-size: 12px; margin: 14px 0 6px; color: ${colors.tealDark}; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; font-weight: 700; font-size: 9px; text-transform: uppercase; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .nowrap { white-space: nowrap; }
  .footer { margin-top: 16px; padding-top: 10px; border-top: 1px solid ${colors.tealBorder}; text-align: center; font-size: 9px; color: ${colors.muted}; }
  @media print { .tile, th { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
  <header class="header">
    ${logoHtml}
    <div>
      <h1>${escapeHtml(HIWET_BRAND.titleBilingual)}</h1>
      <p class="sub"><strong>${escapeHtml(title)}</strong> · owed as of ${escapeHtml(format(new Date(report.asOf), "dd MMM yyyy HH:mm"))}</p>
      <p class="sub">Period activity: ${escapeHtml(fromLabel)} – ${escapeHtml(toLabel)}</p>
    </div>
  </header>

  <h2>Owed now</h2>
  <div class="summary">
    ${tile("Total owed", money(t.outstandingCents), "owe")}
    ${tile("Patients owing", String(t.patientsOwing))}
    ${tile("Invoices", String(t.outstandingCount))}
    ${tile("0-7 days", money(t.aging.days0to7))}
    ${tile("8-30 days", money(t.aging.days8to30))}
    ${tile("Over 30 days", money(t.aging.days31plus))}
  </div>

  <h2>In period</h2>
  <div class="summary">
    ${tile("Billed", money(p.billedCents))}
    ${tile("Collected", money(p.collectedCents))}
    ${tile("Debt collected", money(p.debtCollectedCents))}
    ${tile(`Pay later (${p.payLaterCount})`, money(p.payLaterCents))}
    ${tile(`Waived / free (${p.waivedCount})`, money(p.waivedCents))}
    ${tile("Invoices billed", String(p.invoiceCount))}
  </div>

  <h2>Unpaid invoices (${report.rows.length})</h2>
  <table>
    <thead><tr>
      <th>Issued</th><th class="num">Days</th><th>Invoice</th><th>Patient #</th><th>Patient</th>
      <th class="num">Total</th><th class="num">Paid</th><th class="num">Waived</th><th class="num">Owed</th>
      <th>Reason</th><th>Approved by</th>
    </tr></thead>
    <tbody>${rows || `<tr><td colspan="11">No unpaid invoices.</td></tr>`}</tbody>
  </table>

  <footer class="footer">
    ${escapeHtml(HIWET_BRAND.footerAm)} · ${escapeHtml(HIWET_BRAND.phones)} · ${escapeHtml(HIWET_BRAND.locationEn)}
  </footer>
</body></html>`;
}
