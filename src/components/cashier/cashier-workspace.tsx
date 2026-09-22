"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingBlock } from "@/components/shared/state-blocks";
import { QueueBoard } from "@/components/queues/queue-board";
import { useInvoice } from "@/features/billing/hooks";
import { useCreatePayment, useCreateRefund } from "@/features/payments/hooks";
import { useCurrentCashSession } from "@/features/cash-sessions/hooks";
import { PaymentMethod } from "@/types/finance";
import { formatCents } from "@/lib/format/money";
import { QueueStation } from "@/types/encounter";

export function CashierWorkspace() {
  const searchParams = useSearchParams();
  const initialInvoice = searchParams.get("invoiceId") ?? "";
  const [invoiceId, setInvoiceId] = useState(initialInvoice);
  const [loadId, setLoadId] = useState(initialInvoice);

  const session = useCurrentCashSession();
  const invoice = useInvoice(loadId || null);

  useEffect(() => {
    if (initialInvoice) setLoadId(initialInvoice);
  }, [initialInvoice]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Cashier</h1>
        <p className="text-sm text-slate-600">Payments and refunds (idempotent API).</p>
      </div>

      <SessionBanner session={session} />

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <QueueBoard
          station={QueueStation.CASHIER}
          hrefPrefix="/cashier"
          title="Cashier queue"
          resolveHref={() => null}
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
          <p className="text-sm">
            {invoice.data.invoiceNumber} · {invoice.data.status} ·{" "}
            <Link href={`/billing/invoices/${loadId}`} className="text-teal-700 underline">
              View invoice
            </Link>
          </p>
          <PaymentPanel
            invoiceId={loadId}
            balance={invoice.data.totalCents - invoice.data.paidCents}
            status={invoice.data.status}
            cashSessionId={session.data?.id}
            payments={invoice.data.payments}
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
  balance,
  status,
  cashSessionId,
  payments,
}: {
  invoiceId: string;
  balance: number;
  status: string;
  cashSessionId?: string;
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
  const [amountCents, setAmountCents] = useState(balance);
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [reference, setReference] = useState("");

  const payable = ["ISSUED", "PARTIALLY_PAID"].includes(status) && balance > 0;

  if (!payable) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
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
                {m}
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
        disabled={pay.isPending || amountCents < 1}
        onClick={() =>
          pay.mutate({
            amountCents,
            method,
            referenceNumber: reference || undefined,
            cashSessionId: method === PaymentMethod.CASH ? cashSessionId : undefined,
          })
        }
      >
        {pay.isPending ? "Processing…" : "Submit payment"}
      </Button>

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
