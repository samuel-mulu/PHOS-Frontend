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
import { cn } from "@/lib/utils";

const PRIMARY_METHODS: PaymentMethod[] = [
  PaymentMethod.CASH,
  PaymentMethod.CARD,
  PaymentMethod.TELEBIRR,
];

const OTHER_METHODS: PaymentMethod[] = [
  PaymentMethod.BANK_TRANSFER,
  PaymentMethod.INSURANCE,
  PaymentMethod.OTHER,
];

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
  const [showManualLoad, setShowManualLoad] = useState(!initialInvoice);

  const session = useCurrentCashSession();
  const invoice = useInvoice(loadId || null);
  const encounterQuery = useEncounter(encounterFromQueue || "");

  useEffect(() => {
    if (initialInvoice) {
      setInvoiceId(initialInvoice);
      setLoadId(initialInvoice);
      setShowManualLoad(false);
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
      setShowManualLoad(false);
    }
  }, [encounterQuery.data?.invoice]);

  const queueBase = embedded ? "/front-desk?tab=cashier" : "/cashier";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {!embedded ? (
        <h1 className="text-xl font-semibold text-slate-900">Cashier</h1>
      ) : null}

      <SessionBanner session={session} />

      {loadId && invoice.isLoading ? (
        <LoadingBlock label="Loading invoice" />
      ) : null}

      {loadId && invoice.data ? (
        <PaymentPanel
          invoiceId={loadId}
          invoiceNumber={invoice.data.invoiceNumber}
          patientName={
            invoice.data.patient
              ? `${invoice.data.patient.firstName} ${invoice.data.patient.lastName}`
              : ""
          }
          balance={invoice.data.totalCents - invoice.data.paidCents}
          totalCents={invoice.data.totalCents}
          paidCents={invoice.data.paidCents}
          status={invoice.data.status}
          cashSessionId={session.data?.id}
          payments={invoice.data.payments}
          onFullyPaid={onInvoiceFullyPaid}
        />
      ) : null}

      {!loadId || showManualLoad ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-2">
          <Label className="text-xs">Load invoice</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Invoice ID"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value.trim())}
            />
            <Button type="button" onClick={() => setLoadId(invoiceId)}>
              Load
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="text-xs text-slate-500 underline"
          onClick={() => setShowManualLoad(true)}
        >
          Load a different invoice
        </button>
      )}

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
        Cash payments need an open session.{" "}
        <Link href="/reconciliation" className="font-medium underline">
          Open session
        </Link>
      </div>
    );
  }
  const cashTotal =
    session.data.payments?.reduce((s, p) => s + p.amountCents, 0) ?? 0;
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
      Session open · Float {formatCents(session.data.openingFloatCents)} · Cash
      today {formatCents(cashTotal)}
    </div>
  );
}

function PaymentPanel({
  invoiceId,
  invoiceNumber,
  patientName,
  balance,
  totalCents,
  paidCents,
  status,
  cashSessionId,
  payments,
  onFullyPaid,
}: {
  invoiceId: string;
  invoiceNumber: string;
  patientName: string;
  balance: number;
  totalCents: number;
  paidCents: number;
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
  const [amountEtb, setAmountEtb] = useState((balance / 100).toFixed(2));
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [showMoreMethods, setShowMoreMethods] = useState(false);
  const [reference, setReference] = useState("");
  const [showRefunds, setShowRefunds] = useState(false);
  const [paidDialogOpen, setPaidDialogOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<{
    paymentNumber: string;
    amountCents: number;
    method: string;
  } | null>(null);

  const payable = ["ISSUED", "PARTIALLY_PAID"].includes(status) && balance > 0;
  const amountCents = Math.round(Number(amountEtb) * 100);
  const needsReference =
    method === PaymentMethod.CARD ||
    method === PaymentMethod.TELEBIRR ||
    method === PaymentMethod.BANK_TRANSFER;

  useEffect(() => {
    setAmountEtb((balance / 100).toFixed(2));
  }, [balance]);

  if (!payable && payments.length === 0) return null;

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-slate-900">
            {patientName || invoiceNumber}
          </p>
          <p className="text-sm text-slate-500">
            {invoiceNumber}{" "}
            <span className="ml-1 inline-flex align-middle">
              {invoiceStatusBadge(status)}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Balance due
          </p>
          <p className="text-2xl font-semibold tabular-nums text-slate-900">
            {formatCents(balance)}
          </p>
          {paidCents > 0 ? (
            <p className="text-xs text-slate-500">
              of {formatCents(totalCents)} · paid {formatCents(paidCents)}
            </p>
          ) : null}
        </div>
      </div>

      {payments.length > 0 ? (
        <ul className="space-y-1 border-t border-slate-100 pt-3 text-sm text-slate-700">
          {payments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2">
              {paymentMethodLabel(p.method)} · {formatCents(p.amountCents)}
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
      ) : null}

      {payable ? (
        <div className="space-y-4 border-t border-slate-100 pt-4">
          <div>
            <p className="mb-2 text-xs font-medium text-slate-600">
              Payment method
            </p>
            <div className="flex flex-wrap gap-2">
              {PRIMARY_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={cn(
                    "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                    method === m
                      ? "border-teal-700 bg-teal-800 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                  )}
                  onClick={() => {
                    setMethod(m);
                    setShowMoreMethods(false);
                  }}
                >
                  {paymentMethodLabel(m)}
                </button>
              ))}
              <button
                type="button"
                className={cn(
                  "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                  showMoreMethods || OTHER_METHODS.includes(method)
                    ? "border-teal-700 bg-teal-50 text-teal-900"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                )}
                onClick={() => setShowMoreMethods((v) => !v)}
              >
                More…
              </button>
            </div>
            {showMoreMethods ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {OTHER_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm",
                      method === m
                        ? "border-teal-700 bg-teal-800 text-white"
                        : "border-slate-200 text-slate-700",
                    )}
                    onClick={() => setMethod(m)}
                  >
                    {paymentMethodLabel(m)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Amount (ETB)</Label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                max={balance / 100}
                value={amountEtb}
                onChange={(e) => setAmountEtb(e.target.value)}
              />
            </div>
            {needsReference ? (
              <div>
                <Label className="text-xs">
                  {method === PaymentMethod.CARD
                    ? "POS / auth ref (optional)"
                    : "Reference (optional)"}
                </Label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            ) : null}
          </div>

          {method === PaymentMethod.CASH && !cashSessionId ? (
            <p className="text-sm text-amber-800">
              Open a{" "}
              <Link href="/reconciliation" className="underline">
                cash session
              </Link>{" "}
              first, or pay by Card / Telebirr.
            </p>
          ) : null}

          <Button
            type="button"
            size="lg"
            className="w-full sm:w-auto"
            disabled={
              pay.isPending ||
              amountCents < 1 ||
              amountCents > balance ||
              (method === PaymentMethod.CASH && !cashSessionId)
            }
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
            {pay.isPending
              ? "Processing…"
              : `Take payment · ${formatCents(amountCents || 0)}`}
          </Button>
        </div>
      ) : null}

      {!payable && status === "PAID" ? (
        <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
          {invoiceStatusBadge("PAID")}
          <span className="text-sm text-emerald-800">Paid in full</span>
          {lastReceipt ? (
            <PrintReceipt
              paymentNumber={lastReceipt.paymentNumber}
              invoiceNumber={invoiceNumber}
              patientName={patientName}
              amountCents={lastReceipt.amountCents}
              method={lastReceipt.method}
            />
          ) : null}
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
          <strong>{patientName}</strong> — {invoiceNumber} paid.
        </p>
        {lastReceipt ? (
          <p className="mt-2 text-slate-600">
            {formatCents(lastReceipt.amountCents)} ·{" "}
            {paymentMethodLabel(lastReceipt.method)}
          </p>
        ) : null}
      </SimpleDialog>

      {payments.length > 0 ? (
        <div className="border-t border-slate-100 pt-3">
          <button
            type="button"
            className="text-xs text-slate-500 underline"
            onClick={() => setShowRefunds((v) => !v)}
          >
            {showRefunds ? "Hide refunds" : "Refunds"}
          </button>
          {showRefunds ? (
            <div className="mt-2 space-y-2">
              {payments.map((p) => (
                <RefundRow key={p.id} payment={p} invoiceId={invoiceId} />
              ))}
            </div>
          ) : null}
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
  const [amount, setAmount] = useState(
    payment.amountCents - payment.refundedCents,
  );
  const [reason, setReason] = useState("");
  const max = payment.amountCents - payment.refundedCents;

  if (
    !["COMPLETED", "PARTIALLY_REFUNDED"].includes(payment.status) ||
    max <= 0
  ) {
    return null;
  }

  return (
    <div className="rounded border p-2 text-sm">
      <p>
        {payment.paymentNumber} — refundable {formatCents(max)}
      </p>
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
          placeholder="Reason"
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
