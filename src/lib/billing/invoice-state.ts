/**
 * Invoice money rules shared by cashier, doctor, lab and reports.
 * Must match the backend (phos-backend/src/common/domain/finance.ts):
 *   balance = total - paid - waived        (still owed, includes pay-later debt)
 *   dueNow  = max(0, balance - deferred)   (must be settled before leaving cashier)
 * waivedCents is "total forgiven"; cancelledCents is the part of it that was
 * cancelled at the cashier (patient left without paying).
 */
export type InvoiceMoney = {
  totalCents: number;
  paidCents: number;
  waivedCents?: number | null;
  deferredCents?: number | null;
  cancelledCents?: number | null;
  status?: string;
};

/** Cancelled at cashier (patient left without paying); not owed. */
export function invoiceCancelled(inv: InvoiceMoney | null | undefined): number {
  if (!inv) return 0;
  return Math.min(inv.cancelledCents ?? 0, inv.waivedCents ?? 0);
}

/** Waived as free (excludes cancelled). */
export function invoiceWaivedOnly(inv: InvoiceMoney | null | undefined): number {
  if (!inv) return 0;
  return Math.max(0, (inv.waivedCents ?? 0) - invoiceCancelled(inv));
}

export function invoiceBalance(inv: InvoiceMoney | null | undefined): number {
  if (!inv || inv.status === "VOID") return 0;
  return Math.max(0, inv.totalCents - inv.paidCents - (inv.waivedCents ?? 0));
}

export function invoiceDueNow(inv: InvoiceMoney | null | undefined): number {
  if (!inv) return 0;
  return Math.max(0, invoiceBalance(inv) - (inv.deferredCents ?? 0));
}

/** Approved pay-later debt still owed on this invoice. */
export function invoicePayLater(inv: InvoiceMoney | null | undefined): number {
  if (!inv) return 0;
  return Math.min(inv.deferredCents ?? 0, invoiceBalance(inv));
}

export type InvoiceState =
  | "PAID"
  | "WAIVED"
  | "CANCELLED"
  | "PAY_LATER"
  | "PARTIAL"
  | "DUE";

/** Single word state for badges. */
export function invoiceState(inv: InvoiceMoney | null | undefined): InvoiceState {
  if (!inv) return "DUE";
  const balance = invoiceBalance(inv);
  if (balance <= 0) {
    if (inv.paidCents >= inv.totalCents) return "PAID";
    if (invoiceCancelled(inv) > 0 && invoiceWaivedOnly(inv) === 0)
      return "CANCELLED";
    return (inv.waivedCents ?? 0) > 0 ? "WAIVED" : "PAID";
  }
  if (invoiceDueNow(inv) <= 0) return "PAY_LATER";
  if (inv.paidCents > 0 || (inv.waivedCents ?? 0) > 0) return "PARTIAL";
  return "DUE";
}

export const INVOICE_STATE_LABEL: Record<InvoiceState, string> = {
  PAID: "Paid",
  WAIVED: "Waived (free)",
  CANCELLED: "Cancelled",
  PAY_LATER: "Pay later",
  PARTIAL: "Part paid",
  DUE: "Not paid",
};

export type LineState =
  | "PAID"
  | "PART_PAID"
  | "WAIVED"
  | "CANCELLED"
  | "PAY_LATER"
  | "DUE";

export const LINE_STATE_LABEL: Record<LineState, string> = {
  PAID: "Paid",
  PART_PAID: "Part paid",
  WAIVED: "Waived",
  CANCELLED: "Cancelled",
  PAY_LATER: "Pay later",
  DUE: "Due",
};

type Line = { id: string; totalCents: number };

/**
 * Allocate money to invoice lines in order: paid first, then waived, then
 * cancelled, then pay-later; whatever is left is due now.
 */
export function invoiceLineStates<T extends Line>(
  inv: InvoiceMoney & { items: T[] },
): Array<T & { state: LineState; coveredCents: number; remainingCents: number }> {
  let paid = inv.paidCents;
  let waived = invoiceWaivedOnly(inv);
  let cancelled = invoiceCancelled(inv);
  let deferred = invoicePayLater(inv);
  return inv.items.map((item) => {
    let left = item.totalCents;
    const take = (pool: number) => {
      const used = Math.min(pool, left);
      left -= used;
      return used;
    };
    const p = take(paid);
    paid -= p;
    const w = take(waived);
    waived -= w;
    const c = take(cancelled);
    cancelled -= c;
    const d = take(deferred);
    deferred -= d;
    let state: LineState;
    if (left > 0) state = p > 0 ? "PART_PAID" : "DUE";
    else if (d > 0) state = "PAY_LATER";
    else if (c > 0 && w === 0) state = "CANCELLED";
    else if ((w > 0 || c > 0) && p === 0) state = "WAIVED";
    else state = "PAID";
    return {
      ...item,
      state,
      coveredCents: item.totalCents - left,
      remainingCents: left,
    };
  });
}

/** Lines not yet covered by payment (what the cashier is collecting). */
export function unpaidInvoiceLines<T extends Line>(
  inv: InvoiceMoney & { items: T[] },
): Array<T & { remainingCents: number }> {
  let covered = inv.paidCents + (inv.waivedCents ?? 0) + invoicePayLater(inv);
  const out: Array<T & { remainingCents: number }> = [];
  for (const item of inv.items) {
    const used = Math.min(covered, item.totalCents);
    covered -= used;
    const remaining = item.totalCents - used;
    if (remaining > 0) out.push({ ...item, remainingCents: remaining });
  }
  return out;
}
