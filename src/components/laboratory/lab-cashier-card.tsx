"use client";

import { LineStateBadge, StatusBadge } from "@/components/shared/status-badge";
import { invoiceLineStates, type LineState } from "@/lib/billing/invoice-state";
import { useInvoice } from "@/features/billing/hooks";
import { useEncounter } from "@/features/encounters/hooks";
import { formatCents } from "@/lib/format/money";

function isLabInvoiceLine(description: string, orderNumber?: string) {
  if (orderNumber && description.includes(orderNumber)) return true;
  return /^Lab order /i.test(description);
}

/**
 * Compact cashier / payment status for a lab order (same idea as doctor sidebar).
 */
export function LabCashierCard({
  encounterId,
  orderNumber,
  orderStatus,
}: {
  encounterId: string;
  orderNumber: string;
  orderStatus: string;
}) {
  const encounter = useEncounter(encounterId);
  const atCashierLab =
    encounter.data?.status === "WAITING_PAYMENT" &&
    encounter.data?.paymentReturnStation === "LAB";
  const invoiceId = encounter.data?.invoice?.id ?? null;
  const invoice = useInvoice(invoiceId, {
    refetchInterval: atCashierLab ? 8_000 : false,
  });

  const inv = invoice.data;
  const labItems = (inv ? invoiceLineStates(inv) : []).filter((item) =>
    isLabInvoiceLine(item.description, orderNumber),
  );

  const thisOrderWaitingPay =
    atCashierLab && orderStatus === "ORDERED" && labItems.length > 0;

  // Worst state across this order's lines decides the header.
  const RANK: LineState[] = ["DUE", "PART_PAID", "PAY_LATER", "WAIVED", "PAID"];
  const headerState: LineState | null =
    labItems.length === 0
      ? null
      : labItems.reduce<LineState>(
          (worst, l) =>
            RANK.indexOf(l.state) < RANK.indexOf(worst) ? l.state : worst,
          "PAID",
        );

  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Cashier
        </h3>
        {headerState ? (
          <LineStateBadge state={headerState} atCashier={atCashierLab} />
        ) : atCashierLab ? (
          <StatusBadge label="At cashier" tone="amber" />
        ) : null}
      </div>

      <div className="mt-2">
        {encounter.isLoading || (invoiceId && invoice.isLoading) ? (
          <p className="text-xs text-muted">Checking payment…</p>
        ) : labItems.length === 0 ? (
          <p className="text-xs text-muted">
            {atCashierLab
              ? "Patient is at cashier for lab payment."
              : "None"}
          </p>
        ) : (
          <ul className="space-y-1.5 text-xs">
            {labItems.map((item) => {
              return (
                <li
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-1.5"
                >
                  <span className="text-foreground">{item.description}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    <span className="tabular-nums text-muted">
                      {formatCents(item.totalCents)}
                    </span>
                    <LineStateBadge state={item.state} atCashier={atCashierLab} />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {thisOrderWaitingPay ? (
          <p className="mt-2 text-2xs font-medium text-amber-900">
            Collect payment at cashier before receiving this sample.
          </p>
        ) : null}
      </div>
    </div>
  );
}
