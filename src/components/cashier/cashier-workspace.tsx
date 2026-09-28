"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchInvoice } from "@/features/billing/api";
import { SimpleDialog } from "@/components/shared/simple-dialog";
import { announceClinic } from "@/lib/voice/announce";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingBlock } from "@/components/shared/state-blocks";
import { QueueBoard } from "@/components/queues/queue-board";
import { useInvoice } from "@/features/billing/hooks";
import { useEncounter } from "@/features/encounters/hooks";
import { useCreatePayment, useCreateRefund } from "@/features/payments/hooks";
import { PrintReceipt } from "@/components/print/print-receipt";
import type { QueueEntry } from "@/features/queues/api";
import { useCurrentCashSession } from "@/features/cash-sessions/hooks";
import { PaymentMethod } from "@/types/finance";
import { formatCents } from "@/lib/format/money";
import { paymentMethodLabel } from "@/lib/format/payment-method";
import { QueueStation } from "@/types/encounter";
import { invoiceStatusBadge } from "@/components/shared/status-badge";

export function CashierWorkspace({
  embedded,
  onInvoiceFullyPaid,
}: {
  embedded?: boolean;
  onInvoiceFullyPaid?: (invoiceId: string) => void;
} = {}) {
  const searchParams = useSearchParams();
  const initialInvoice = searchParams.get("invoiceId") ?? "";
  const encounterFromQueue = searchParams.get("encounterId") ?? "";
  const [invoiceId, setInvoiceId] = useState(initialInvoice);
  const [loadId, setLoadId] = useState(initialInvoice);

  const session = useCurrentCashSession();
  const invoice = useInvoice(loadId || null);
  const encounterQuery = useEncounter(encounterFromQueue || "");

  useEffect(() => {
    if (initialInvoice) {
      setInvoiceId(initialInvoice);
      setLoadId(initialInvoice);
    }
  }, [initialInvoice]);

  useEffect(() => {
    const inv = encounterQuery.data?.invoice as
      | { id: string }
      | null
      | undefined;
    if (inv?.id) {
      setInvoiceId(inv.id);
      setLoadId(inv.id);
    }
  }, [encounterQuery.data?.invoice]);

  const queueBase = embedded ? "/front-desk?tab=cashier" : "/cashier";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {!embedded ? (
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Cashier</h1>
          <p className="text-sm text-slate-600">Payments and refunds (idempotent API).</p>
        </div>
      ) : null}

      <SessionBanner session={session} />

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <QueueBoard
          station={QueueStation.CASHIER}
          hrefPrefix={queueBase}
          title="Cashier queue"
          resolveHref={(entry: QueueEntry) =>
            `${queueBase}&encounterId=${entry.encounterId}`
          }
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-2">
        <Label className="text-xs">Invoice ID</Label>
        <div className="flex gap-2">
          <Input value={invoiceId} onChange={(e) => setInvoiceId(e.target.value.trim())} />
          <Button type="button" onClick={() => setLoadId(invoiceId)}>
            Load
          </Button>
        </div>
      </div>

      {loadId && invoice.isLoading ? <LoadingBlock label="Loading invoice" /> : null}
      {loadId && invoice.data ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{invoice.data.invoiceNumber}</span>
            {invoiceStatusBadge(invoice.data.status)}
            <Link href={`/billing/invoices/${loadId}`} className="text-teal-700 underline">
              View invoice
            </Link>
          </div>
          <PaymentPanel
            invoiceId={loadId}
            invoiceNumber={invoice.data.invoiceNumber}
            patientName={
              invoice.data.patient
                ? `${invoice.data.patient.firstName} ${invoice.data.patient.lastName}`
                : ""
            }
            balance={invoice.data.totalCents - invoice.data.paidCents}
            status={invoice.data.status}
            cashSessionId={session.data?.id}
            payments={invoice.data.payments}
            onFullyPaid={onInvoiceFullyPaid}
          />
        </div>
      ) : null}
    </div>
  );
}

function SessionBanner({
  session,
}: {
  session: ReturnType<typeof useCurrentCashSession>;
}) {
  if (session.isLoading) return <LoadingBlock label="Checking cash session" />;
  if (!session.data) {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        No open cash session.{" "}
        <Link href="/reconciliation" className="font-medium underline">
          Open a session
        </Link>{" "}
        before accepting cash payments.
      </div>
    );
  }
  const cashTotal =
    session.data.payments?.reduce((s, p) => s + p.amountCents, 0) ?? 0;
  return (
    <div className="rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm">
      <p className="font-medium text-teal-900">Cash session open</p>
      <p className="text-teal-800">
        Float: {formatCents(session.data.openingFloatCents)} · Cash collected this
        session: {formatCents(cashTotal)}
      </p>
    </div>
  );
}

function PaymentPanel({
  invoiceId,
  invoiceNumber,
  patientName,
  balance,
  status,
  cashSessionId,
  payments,
  onFullyPaid,
}: {
  invoiceId: string;
  invoiceNumber: string;
  patientName: string;
  balance: number;
  status: string;
  cashSessionId?: string;
  onFullyPaid?: (invoiceId: string) => void;
  payments: Array<{
    id: string;
    paymentNumber: string;
    amountCents: number;
    refundedCents: number;
    method: string;
    status: string;
  }>;
}) {
  const pay = useCreatePayment(invoiceId);
  const queryClient = useQueryClient();
  const [amountCents, setAmountCents] = useState(balance);
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [reference, setReference] = useState("");
  const [paidDialogOpen, setPaidDialogOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<{
    paymentNumber: string;
    amountCents: number;
    method: string;
  } | null>(null);

  const payable = ["ISSUED", "PARTIALLY_PAID"].includes(status) && balance > 0;

  useEffect(() => {
    setAmountCents(balance);
  }, [balance]);

  if (!payable && payments.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      {payments.length > 0 ? (
        <div className="space-y-2 border-b border-slate-100 pb-3">
          <h2 className="text-sm font-semibold">Payments recorded</h2>
          <ul className="space-y-1 text-sm text-slate-700">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2">
                {p.paymentNumber} — {formatCents(p.amountCents)} (
                {paymentMethodLabel(p.method)})
                <PrintReceipt
                  paymentNumber={p.paymentNumber}
                  invoiceNumber={invoiceNumber}
                  patientName={patientName}
                  amountCents={p.amountCents}
                  method={p.method}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {lastReceipt ? (
        <p className="text-sm text-teal-800">
          Payment saved: {lastReceipt.paymentNumber}{" "}
          <PrintReceipt
            paymentNumber={lastReceipt.paymentNumber}
            invoiceNumber={invoiceNumber}
            patientName={patientName}
            amountCents={lastReceipt.amountCents}
            method={lastReceipt.method}
          />
        </p>
      ) : null}
      {payable ? (
        <>
          <h2 className="text-sm font-semibold">Record payment</h2>
          <p className="text-sm">Balance due: {formatCents(balance)}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Amount (cents)</Label>
              <Input
                type="number"
                min={1}
                max={balance}
                value={amountCents}
                onChange={(e) => setAmountCents(Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-xs">Method</Label>
              <select
                className="h-10 w-full rounded-md border px-2 text-sm"
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              >
                {Object.values(PaymentMethod).map((m) => (
                  <option key={m} value={m}>
                    {paymentMethodLabel(m)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Reference</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          </div>
          <Button
            type="button"
            disabled={pay.isPending || amountCents < 1 || !payable}
            onClick={() =>
              pay.mutate(
                {
                  amountCents,
                  method,
                  referenceNumber: reference || undefined,
                  cashSessionId:
                    method === PaymentMethod.CASH ? cashSessionId : undefined,
                },
                {
                  onSuccess: async (payment) => {
                    setLastReceipt({
                      paymentNumber: payment.paymentNumber,
                      amountCents: payment.amountCents,
                      method: payment.method,
                    });
                    const inv = await queryClient.fetchQuery({
                      queryKey: ["invoices", invoiceId],
                      queryFn: () => fetchInvoice(invoiceId),
                    });
                    if (inv.status === "PAID") {
                      setPaidDialogOpen(true);
                      announceClinic(
                        `Payment complete for ${patientName}. Invoice paid in full.`,
                      );
                      onFullyPaid?.(invoiceId);
                    }
                  },
                },
              )
            }
          >
            {pay.isPending ? "Processing…" : "Submit payment"}
          </Button>
        </>
      ) : null}

      {!payable && status === "PAID" ? (
        <div className="flex items-center gap-2">
          {invoiceStatusBadge("PAID")}
          <span className="text-sm text-emerald-800">This invoice is fully paid.</span>
        </div>
      ) : null}

      <SimpleDialog
        open={paidDialogOpen}
        title="Payment complete"
        primaryLabel="Done"
        onPrimary={() => setPaidDialogOpen(false)}
        onClose={() => setPaidDialogOpen(false)}
      >
        <p>
          <strong>{patientName}</strong> — invoice <strong>{invoiceNumber}</strong> is
          now <span className="font-semibold text-emerald-800">PAID</span>.
        </p>
        {lastReceipt ? (
          <p className="mt-2 text-slate-600">
            Receipt {lastReceipt.paymentNumber} ·{" "}
            {formatCents(lastReceipt.amountCents)} ·{" "}
            {paymentMethodLabel(lastReceipt.method)}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-slate-500">
          Visit status updates to completed when the full balance was collected.
        </p>
      </SimpleDialog>

      {payments.length > 0 ? (
        <div className="border-t pt-3 space-y-2">
          <p className="text-xs font-medium text-slate-700">Refunds</p>
          {payments.map((p) => (
            <RefundRow key={p.id} payment={p} invoiceId={invoiceId} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RefundRow({
  payment,
  invoiceId,
}: {
  payment: {
    id: string;
    paymentNumber: string;
    amountCents: number;
    refundedCents: number;
    status: string;
  };
  invoiceId: string;
}) {
  const refund = useCreateRefund(payment.id, invoiceId);
  const [amount, setAmount] = useState(payment.amountCents - payment.refundedCents);
  const [reason, setReason] = useState("");
  const max = payment.amountCents - payment.refundedCents;

  if (!["COMPLETED", "PARTIALLY_REFUNDED"].includes(payment.status) || max <= 0) {
    return null;
  }

  return (
    <div className="rounded border p-2 text-sm">
      <p>{payment.paymentNumber} — refundable {formatCents(max)}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Input
          type="number"
          className="max-w-[120px]"
          min={1}
          max={max}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
        <Input
          className="min-w-[200px] flex-1"
          placeholder="Reason (min 5 chars)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={refund.isPending || reason.length < 5}
          onClick={() => refund.mutate({ amountCents: amount, reason })}
        >
          Refund
        </Button>
      </div>
    </div>
  );
}
