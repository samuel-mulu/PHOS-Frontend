"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchInvoice } from "@/features/billing/api";
import { SimpleDialog } from "@/components/shared/simple-dialog";
import { announceClinic, stationCallLabel } from "@/lib/voice/announce";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EmptyState,
  ErrorState,
  LoadingBlock,
} from "@/components/shared/state-blocks";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/shared/data-table";
import { useInvoice } from "@/features/billing/hooks";
import { useEncounter } from "@/features/encounters/hooks";
import { useCreatePayment, useCreateRefund } from "@/features/payments/hooks";
import { PrintReceipt } from "@/components/print/print-receipt";
import { useQueue, useUpdateQueueEntry } from "@/features/queues/hooks";
import { useCurrentCashSession } from "@/features/cash-sessions/hooks";
import { PaymentMethod } from "@/types/finance";
import { formatCents } from "@/lib/format/money";
import { formatWaitingSince } from "@/lib/format/wait-time";
import { paymentMethodLabel } from "@/lib/format/payment-method";
import { QueueStation } from "@/types/encounter";
import { invoiceStatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { sortQueueNewestFirst } from "@/lib/queues/sort";
import { ExpandablePanel } from "@/components/shared/table-layout";
import { PaymentsReportPanel } from "@/components/payments/payments-report-panel";
import { toast } from "sonner";

function returnStationLabel(
  station: string | null | undefined,
): string | null {
  if (!station) return null;
  const map: Record<string, string> = {
    DOCTOR: "Doctor",
    LAB: "Lab",
    PHARMACY: "Pharmacy",
    TRIAGE: "Triage",
  };
  return map[station] ?? station;
}

type CashierTab = "waiting" | "collect" | "load" | "report";

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

function RedBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function withQuery(base: string, params: Record<string, string>) {
  const url = new URL(base, "http://local");
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  return `${url.pathname}${url.search}`;
}

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
  const [tab, setTab] = useState<CashierTab>(
    initialInvoice || encounterFromQueue ? "collect" : "waiting",
  );

  const session = useCurrentCashSession();
  const queue = useQueue(QueueStation.CASHIER, 8_000);
  const updateEntry = useUpdateQueueEntry();
  const invoice = useInvoice(loadId || null);
  const encounterQuery = useEncounter(encounterFromQueue || "");

  const waitingCount = queue.data?.length ?? 0;
  const hasCollect = Boolean(loadId && invoice.data);
  const balanceDue =
    invoice.data != null
      ? invoice.data.totalCents - invoice.data.paidCents
      : 0;

  useEffect(() => {
    if (initialInvoice) {
      setInvoiceId(initialInvoice);
      setLoadId(initialInvoice);
      setTab("collect");
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
      setTab("collect");
    }
  }, [encounterQuery.data?.invoice]);

  // New patients in queue → highlight Waiting tab
  const prevWaiting = useRef(0);
  useEffect(() => {
    if (waitingCount > prevWaiting.current && !loadId) {
      setTab("waiting");
    }
    prevWaiting.current = waitingCount;
  }, [waitingCount, loadId]);

  const queueBase = embedded ? "/front-desk?tab=payments" : "/cashier";

  const waitingItems = useMemo(
    () => sortQueueNewestFirst(queue.data ?? []),
    [queue.data],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {!embedded ? (
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Cashier</h1>
          <p className="text-sm text-slate-600">
            Call patients waiting to pay, then collect. Red badges update live.
          </p>
        </div>
      ) : null}

      <SessionBanner session={session} />

      <nav
        className="flex flex-wrap gap-2 border-b border-slate-200 pb-2"
        aria-label="Cashier queues"
      >
        <TabButton
          active={tab === "waiting"}
          onClick={() => setTab("waiting")}
          label="Waiting to pay"
          badge={waitingCount}
          emphasize={waitingCount > 0}
        />
        <TabButton
          active={tab === "collect"}
          onClick={() => setTab("collect")}
          label="Collect payment"
          badge={hasCollect && balanceDue > 0 ? 1 : 0}
          emphasize={hasCollect && balanceDue > 0}
        />
        <TabButton
          active={tab === "load"}
          onClick={() => setTab("load")}
          label="Load invoice"
          badge={0}
          muted
        />
        {!embedded ? (
          <TabButton
            active={tab === "report"}
            onClick={() => setTab("report")}
            label="Report"
            badge={0}
            muted
          />
        ) : null}
      </nav>

      {tab === "waiting" ? (
        <ExpandablePanel
          className={
            waitingCount > 0
              ? "border-red-200 ring-1 ring-red-100"
              : undefined
          }
          title={
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Waiting to pay
              </h2>
              <p className="text-xs font-normal text-slate-500">
                Call → Start → Collect payment
              </p>
            </div>
          }
          toolbar={
            waitingCount > 0 ? (
              <span className="inline-flex items-center rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
                {waitingCount} waiting
              </span>
            ) : undefined
          }
        >
          {queue.isLoading ? (
            <LoadingBlock label="Loading cashier queue" />
          ) : null}
          {queue.isError ? (
            <ErrorState
              message="Could not load cashier queue."
              onRetry={() => void queue.refetch()}
            />
          ) : null}
          {queue.isSuccess && waitingItems.length === 0 ? (
            <EmptyState
              title="No one waiting"
              description="When a doctor or lab sends a patient for payment, they appear here. After you collect, they return to that station automatically."
            />
          ) : null}
          {waitingItems.length > 0 ? (
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell>Patient</DataTableHeaderCell>
                  <DataTableHeaderCell>Visit</DataTableHeaderCell>
                  <DataTableHeaderCell>Waiting</DataTableHeaderCell>
                  <DataTableHeaderCell>Return after pay</DataTableHeaderCell>
                  <DataTableHeaderCell>Status</DataTableHeaderCell>
                  <DataTableHeaderCell stickyRight>Actions</DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <DataTableBody>
                {waitingItems.map((entry) => {
                  const p = entry.encounter.patient;
                  const href = withQuery(queueBase, {
                    encounterId: entry.encounterId,
                  });
                  const returnTo = returnStationLabel(
                    entry.encounter.paymentReturnStation,
                  );
                  return (
                    <DataTableRow
                      key={entry.id}
                      className="bg-red-50/30"
                    >
                      <DataTableCell>
                        <span className="font-medium">
                          {p.firstName} {p.lastName}
                        </span>
                        <p className="text-xs text-slate-500">
                          {p.patientNumber}
                        </p>
                      </DataTableCell>
                      <DataTableCell>
                        {entry.encounter.encounterNumber}
                      </DataTableCell>
                      <DataTableCell>
                        {formatWaitingSince(entry.enteredAt)}
                      </DataTableCell>
                      <DataTableCell>
                        {returnTo ? (
                          <span className="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-900">
                            Return to {returnTo}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </DataTableCell>
                      <DataTableCell className="text-xs">
                        {entry.status.replaceAll("_", " ")}
                      </DataTableCell>
                      <DataTableCell stickyRight className="text-right">
                        {entry.status === "WAITING" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={updateEntry.isPending}
                            onClick={() =>
                              updateEntry.mutate(
                                { id: entry.id, status: "CALLED" },
                                {
                                  onSuccess: () => {
                                    announceClinic(
                                      `${p.firstName} ${p.lastName}, please proceed to ${stationCallLabel("CASHIER")}.`,
                                    );
                                  },
                                },
                              )
                            }
                          >
                            Call
                          </Button>
                        ) : null}
                        {(entry.status === "WAITING" ||
                          entry.status === "CALLED") && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="ml-1"
                            disabled={updateEntry.isPending}
                            onClick={() =>
                              updateEntry.mutate({
                                id: entry.id,
                                status: "IN_SERVICE",
                              })
                            }
                          >
                            Start
                          </Button>
                        )}
                        <Link href={href}>
                          <Button
                            type="button"
                            size="sm"
                            className="ml-2 bg-red-700 hover:bg-red-800"
                            onClick={() => setTab("collect")}
                          >
                            Collect
                          </Button>
                        </Link>
                      </DataTableCell>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
          ) : null}
        </ExpandablePanel>
      ) : null}

      {tab === "collect" ? (
        <section className="space-y-3">
          {encounterFromQueue && encounterQuery.isLoading ? (
            <LoadingBlock label="Loading visit invoice" />
          ) : null}
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
              returnStation={
                waitingItems.find((e) => e.encounterId === encounterFromQueue)
                  ?.encounter.paymentReturnStation ??
                encounterQuery.data?.paymentReturnStation ??
                null
              }
              onFullyPaid={(id, returnStation) => {
                const dest = returnStationLabel(returnStation);
                toast.success(
                  dest
                    ? `Paid — patient sent back to ${dest}`
                    : "Paid in full",
                );
                onInvoiceFullyPaid?.(id);
                setTab("waiting");
              }}
              onBackToQueue={() => setTab("waiting")}
            />
          ) : (
            <EmptyState
              title="No invoice open"
              description="Open a patient from Waiting to pay, or load an invoice by ID."
            />
          )}
          {!loadId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTab("load")}
            >
              Load invoice by ID
            </Button>
          ) : null}
        </section>
      ) : null}

      {tab === "load" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Load invoice
            </h2>
            <p className="text-xs text-slate-500">
              Paste an invoice ID if the patient is not in the queue
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Invoice ID"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value.trim())}
            />
            <Button
              type="button"
              onClick={() => {
                setLoadId(invoiceId);
                setTab("collect");
              }}
              disabled={!invoiceId}
            >
              Open
            </Button>
          </div>
        </section>
      ) : null}

      {!embedded && tab === "report" ? <PaymentsReportPanel /> : null}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  badge,
  emphasize,
  muted,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge: number;
  emphasize?: boolean;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-teal-800 text-white"
          : emphasize && badge > 0
            ? "bg-red-50 text-red-900 ring-1 ring-red-200 hover:bg-red-100"
            : muted
              ? "bg-slate-50 text-slate-600 hover:bg-slate-100"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200",
      )}
    >
      {label}
      <RedBadge count={badge} />
    </button>
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
  returnStation,
  onFullyPaid,
  onBackToQueue,
}: {
  invoiceId: string;
  invoiceNumber: string;
  patientName: string;
  balance: number;
  totalCents: number;
  paidCents: number;
  status: string;
  cashSessionId?: string;
  returnStation?: string | null;
  onFullyPaid?: (invoiceId: string, returnStation?: string | null) => void;
  onBackToQueue?: () => void;
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

  if (!payable && payments.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-600">
          Invoice {invoiceNumber} has nothing to collect ({status}).
        </p>
        {onBackToQueue ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={onBackToQueue}
          >
            Back to waiting
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "space-y-4 rounded-lg border bg-white p-5 shadow-sm",
        payable ? "border-red-200 ring-1 ring-red-100" : "border-slate-200",
      )}
    >
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

      {returnStationLabel(returnStation) ? (
        <p className="rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-950 ring-1 ring-sky-100">
          After payment, patient returns to{" "}
          <span className="font-semibold">
            {returnStationLabel(returnStation)}
          </span>{" "}
          automatically — no send-back step.
        </p>
      ) : null}

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

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="lg"
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
                      method === PaymentMethod.CASH
                        ? cashSessionId
                        : undefined,
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
                        const dest = returnStationLabel(returnStation);
                        announceClinic(
                          dest
                            ? `Payment complete for ${patientName}. Please return to ${dest}.`
                            : `Payment complete for ${patientName}. Invoice paid in full.`,
                        );
                        onFullyPaid?.(invoiceId, returnStation);
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
            {onBackToQueue ? (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={onBackToQueue}
              >
                Back to waiting
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {!payable && status === "PAID" ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
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
          {onBackToQueue ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBackToQueue}
            >
              Back to waiting
            </Button>
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
