"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/shared/data-table";
import { PatientIdentityBar } from "@/components/shared/patient-identity-bar";
import { ErrorState, LoadingBlock } from "@/components/shared/state-blocks";
import { useIssueInvoice, useInvoice, useVoidInvoice } from "@/features/billing/hooks";
import { formatCents } from "@/lib/format/money";
import { useCurrentUser } from "@/features/auth/hooks";
import { canIssueInvoice, canTakePayment } from "@/lib/permissions";
import { Role } from "@/types/role";
import { invoiceStatusBadge } from "@/components/shared/status-badge";

export function InvoiceDetail({ invoiceId }: { invoiceId: string }) {
  const invoice = useInvoice(invoiceId);
  const issue = useIssueInvoice(invoiceId);
  const voidInv = useVoidInvoice(invoiceId);
  const { data: user } = useCurrentUser();

  if (invoice.isLoading) return <LoadingBlock label="Loading invoice" />;
  if (invoice.isError || !invoice.data) {
    return <ErrorState message="Invoice not found." onRetry={() => void invoice.refetch()} />;
  }

  const inv = invoice.data;
  const balance = inv.totalCents - inv.paidCents;
  const role = user?.role;
  const canIssue =
    inv.status === "DRAFT" && role != null && canIssueInvoice(role);
  const canVoid = user?.role === Role.ADMIN && inv.paidCents === 0;
  const canPay =
    ["ISSUED", "PARTIALLY_PAID"].includes(inv.status) &&
    balance > 0 &&
    role != null &&
    canTakePayment(role);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/billing" className="text-sm text-teal-700 underline">
          ← Billing
        </Link>
        {canPay ? (
          <Link
            href={
              role === Role.FRONT_DESK || role === Role.RECEPTIONIST
                ? `/front-desk?tab=cashier&invoiceId=${inv.id}`
                : `/cashier?invoiceId=${inv.id}`
            }
          >
            <Button type="button" size="sm">
              Take payment
            </Button>
          </Link>
        ) : null}
      </div>

      <PatientIdentityBar
        patient={inv.patient}
        encounterNumber={inv.encounter.encounterNumber}
        encounterStatus={inv.encounter.status}
      />

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap justify-between gap-2">
          <div>
            <p className="text-lg font-semibold">{inv.invoiceNumber}</p>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
              <span>Status</span>
              {invoiceStatusBadge(inv.status)}
            </div>
          </div>
          <div className="text-right text-sm">
            <p>Subtotal: {formatCents(inv.subtotalCents)}</p>
            <p>Discount: {formatCents(inv.discountCents)}</p>
            <p className="font-semibold">Total: {formatCents(inv.totalCents)}</p>
            <p>Paid: {formatCents(inv.paidCents)}</p>
            <p className="text-teal-800">Balance: {formatCents(balance)}</p>
          </div>
        </div>

        <div className="mt-4">
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell>Type</DataTableHeaderCell>
                <DataTableHeaderCell>Description</DataTableHeaderCell>
                <DataTableHeaderCell>Qty</DataTableHeaderCell>
                <DataTableHeaderCell>Unit</DataTableHeaderCell>
                <DataTableHeaderCell>Line</DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {inv.items.map((item) => (
                <DataTableRow key={item.id}>
                  <DataTableCell>{item.type}</DataTableCell>
                  <DataTableCell>{item.description}</DataTableCell>
                  <DataTableCell>{item.quantity}</DataTableCell>
                  <DataTableCell>{formatCents(item.unitPriceCents)}</DataTableCell>
                  <DataTableCell>{formatCents(item.totalCents)}</DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {canIssue ? (
            <Button type="button" disabled={issue.isPending} onClick={() => issue.mutate()}>
              {issue.isPending ? "Issuing…" : "Issue invoice"}
            </Button>
          ) : null}
          {canVoid && inv.status !== "VOID" ? (
            <Button
              type="button"
              variant="destructive"
              disabled={voidInv.isPending}
              onClick={() => voidInv.mutate()}
            >
              Void invoice
            </Button>
          ) : null}
        </div>
      </div>

      {inv.payments.length > 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-800">Payments</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {inv.payments.map((p) => (
              <li key={p.id} className="rounded border border-slate-100 p-2">
                {p.paymentNumber} — {formatCents(p.amountCents)} ({p.method}) —{" "}
                {p.status}
                {p.refunds.map((r) => (
                  <p key={r.id} className="text-xs text-amber-800">
                    Refund {r.refundNumber}: {formatCents(r.amountCents)} — {r.reason}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
