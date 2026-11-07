"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchInvoice, type Invoice } from "@/features/billing/api";
import { SimpleDialog } from "@/components/shared/simple-dialog";
import {
  announcePatientCall,
  buildPaymentCompleteMessage,
  buildReturnToStationMessage,
  announceClinic,
} from "@/lib/voice/announce";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  useDeferInvoice,
  useInvoice,
  useWaiveInvoice,
} from "@/features/billing/hooks";
import { useEncounter } from "@/features/encounters/hooks";
import { useCreatePayment } from "@/features/payments/hooks";
import { usePatientBalance } from "@/features/patients/hooks";
import { PrintReceipt, type ReceiptData } from "@/components/print/print-receipt";
import { useQueue, useUpdateQueueEntry } from "@/features/queues/hooks";
import { PaymentMethod } from "@/types/finance";
import { formatCents } from "@/lib/format/money";
import { formatWaitingSince } from "@/lib/format/wait-time";
import { paymentMethodLabel } from "@/lib/format/payment-method";
import { QueueStation } from "@/types/encounter";
import { invoiceStateBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { sortByEnteredAtDesc } from "@/lib/queues/sort";
import { ExpandablePanel } from "@/components/shared/table-layout";
import { PaymentsReportPanel } from "@/components/payments/payments-report-panel";
import { ReceivablesReportPanel } from "@/components/payments/receivables-report-panel";
import { ExpenseRecordPanel } from "@/components/expenses/expense-record-panel";
import { ExpensesReportPanel } from "@/components/expenses/expenses-report-panel";
import {
  invoiceBalance,
  invoiceDueNow,
  invoicePayLater,
  unpaidInvoiceLines,
} from "@/lib/billing/invoice-state";
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

type CashierTab = "waiting" | "debts" | "expenses" | "report";

function whyPayLabel(returnStation: string | null | undefined): string {
  if (returnStation === "LAB") return "Lab";
  if (returnStation === "DOCTOR") return "Doctor";
  if (returnStation === "TRIAGE") return "Triage";
  if (returnStation === "PHARMACY") return "Pharmacy";
  return "Visit";
}

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

/** "250" / "250.5" ETB -> cents; NaN when invalid. */
function etbToCents(value: string): number {
  const n = Number(value.replace(/,/g, "").trim());
  if (!value.trim() || !Number.isFinite(n) || n < 0) return Number.NaN;
  return Math.round(n * 100);
}

const centsToEtbInput = (cents: number) => (cents / 100).toFixed(2);

/** What happened at the cashier - shown in the result dialog. */
type CashierResult = {
  title: string;
  patientName: string;
  invoiceNumber: string;
  returnStation: string | null;
  paidNowCents: number;
  waivedNowCents: number;
  owedCents: number;
  receipt?: ReceiptData;
};

function RedBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-3xs font-bold leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function CashierWorkspace({
  embedded,
  onInvoiceFullyPaid,
}: {
  embedded?: boolean;
  /** Called whenever the patient leaves the cashier (paid, pay later or waived). */
  onInvoiceFullyPaid?: (invoiceId: string) => void;
} = {}) {
  const searchParams = useSearchParams();
  const encounterFromUrl = searchParams.get("encounterId") ?? "";
  const invoiceFromUrl = searchParams.get("invoiceId") ?? "";
  const [selectedEncounterId, setSelectedEncounterId] = useState(encounterFromUrl);
  const [tab, setTab] = useState<CashierTab>("waiting");
  const [result, setResult] = useState<CashierResult | null>(null);

  const queue = useQueue(QueueStation.CASHIER, 8_000);
  const updateEntry = useUpdateQueueEntry();
  const invoiceFromLink = useInvoice(
    encounterFromUrl ? null : invoiceFromUrl || null,
  );
  const encounterQuery = useEncounter(selectedEncounterId);
  const invoiceId = encounterQuery.data?.invoice?.id ?? "";
  const invoice = useInvoice(invoiceId || null);

  const waitingCount = queue.data?.length ?? 0;
  const waitingItems = useMemo(
    () => sortByEnteredAtDesc(queue.data ?? []),
    [queue.data],
  );

  useEffect(() => {
    if (encounterFromUrl) setSelectedEncounterId(encounterFromUrl);
  }, [encounterFromUrl]);

  useEffect(() => {
    if (!encounterFromUrl && invoiceFromLink.data?.encounterId) {
      setSelectedEncounterId(invoiceFromLink.data.encounterId);
    }
  }, [encounterFromUrl, invoiceFromLink.data?.encounterId]);

  function selectEncounter(id: string, nextTab: CashierTab = "waiting") {
    setSelectedEncounterId(id);
    setTab(nextTab);
    const url = new URL(window.location.href);
    url.searchParams.set("encounterId", id);
    url.searchParams.delete("invoiceId");
    window.history.replaceState({}, "", url.toString());
  }

  function clearCollect() {
    setSelectedEncounterId("");
    const url = new URL(window.location.href);
    url.searchParams.delete("encounterId");
    url.searchParams.delete("invoiceId");
    window.history.replaceState({}, "", url.toString());
  }

  const collecting = Boolean(selectedEncounterId);
  const returnStation =
    waitingItems.find((e) => e.encounterId === selectedEncounterId)
      ?.encounter.paymentReturnStation ??
    encounterQuery.data?.paymentReturnStation ??
    null;

  function finish(next: CashierResult, id: string) {
    setResult(next);
    const label = returnStationLabel(next.returnStation);
    toast.success(label ? `${next.title} - sent back to ${label}` : next.title);
    onInvoiceFullyPaid?.(id);
    clearCollect();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {!embedded ? (
        <div>
          <h1 className="text-xl font-semibold text-foreground">Cashier</h1>
          <p className="text-sm text-muted">
            Patients sent to pay (visit fee, doctor, lab). Take full or part
            payment, approve pay later, or waive - then they go back
            automatically.
          </p>
        </div>
      ) : null}

      <nav
        className="flex flex-wrap gap-2 border-b border-border pb-2"
        aria-label="Cashier"
      >
        <TabButton
          active={tab === "waiting"}
          onClick={() => {
            setTab("waiting");
            if (!collecting) clearCollect();
          }}
          label="Waiting to pay"
          badge={waitingCount}
          emphasize={waitingCount > 0}
        />
        <TabButton
          active={tab === "debts"}
          onClick={() => setTab("debts")}
          label="Debts"
          badge={0}
          muted
        />
        {!embedded ? (
          <>
            <TabButton
              active={tab === "expenses"}
              onClick={() => setTab("expenses")}
              label="Expenses"
              badge={0}
              muted
            />
            <TabButton
              active={tab === "report"}
              onClick={() => setTab("report")}
              label="Report"
              badge={0}
              muted
            />
          </>
        ) : null}
      </nav>

      {(tab === "waiting" || tab === "debts") && collecting ? (
        <section className="space-y-3">
          {encounterQuery.isLoading || (invoiceId && invoice.isLoading) ? (
            <LoadingBlock label="Loading amount due" />
          ) : null}
          {invoice.data ? (
            <PaymentPanel
              invoice={invoice.data}
              returnStation={returnStation}
              onDone={(next) => finish(next, invoice.data!.id)}
              onBackToQueue={clearCollect}
              onOpenEncounter={(id) => selectEncounter(id, tab)}
            />
          ) : encounterQuery.isSuccess && !invoiceId ? (
            <EmptyState
              title="Nothing to collect"
              description="This visit has no unpaid charge yet."
            />
          ) : null}
        </section>
      ) : null}

      {tab === "waiting" ? (
        <ExpandablePanel
          className={
            waitingCount > 0
              ? "border-red-200 ring-1 ring-red-100"
              : undefined
          }
          title={
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Waiting to pay
              </h2>
              <p className="text-xs font-normal text-muted">
                Latest first. Collect visit fees, doctor charges, and lab.
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
              message="Could not load waiting patients."
              onRetry={() => void queue.refetch()}
            />
          ) : null}
          {queue.isSuccess && waitingItems.length === 0 ? (
            <EmptyState
              title="No one waiting"
              description="When reception, a doctor, or lab sends a patient to pay, they appear here."
            />
          ) : null}
          {waitingItems.length > 0 ? (
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell>Patient</DataTableHeaderCell>
                  <DataTableHeaderCell>Why / next</DataTableHeaderCell>
                  <DataTableHeaderCell>Due now</DataTableHeaderCell>
                  <DataTableHeaderCell>Waiting</DataTableHeaderCell>
                  <DataTableHeaderCell stickyRight>Actions</DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <DataTableBody>
                {waitingItems.map((entry) => {
                  const p = entry.encounter.patient;
                  const why = whyPayLabel(
                    entry.encounter.paymentReturnStation,
                  );
                  const inv = entry.encounter.invoice;
                  const selected = entry.encounterId === selectedEncounterId;
                  return (
                    <DataTableRow
                      key={entry.id}
                      className={selected ? "bg-teal-50" : "bg-red-50/30"}
                    >
                      <DataTableCell>
                        <span className="font-medium">
                          {p.firstName} {p.lastName}
                        </span>
                        <p className="text-xs text-muted">
                          {p.patientNumber} · {entry.encounter.encounterNumber}
                        </p>
                      </DataTableCell>
                      <DataTableCell>
                        <span className="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-900">
                          {why}
                        </span>
                      </DataTableCell>
                      <DataTableCell className="tabular-nums font-semibold">
                        {inv ? formatCents(invoiceDueNow(inv)) : "-"}
                        {inv && inv.paidCents > 0 ? (
                          <p className="text-2xs font-normal text-muted">
                            part paid {formatCents(inv.paidCents)}
                          </p>
                        ) : null}
                      </DataTableCell>
                      <DataTableCell>
                        {formatWaitingSince(entry.enteredAt)}
                      </DataTableCell>
                      <DataTableCell stickyRight className="text-right">
                        {entry.status === "WAITING" ||
                        entry.status === "CALLED" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={updateEntry.isPending}
                            onClick={() =>
                              updateEntry.mutate(
                                { id: entry.id, status: "IN_SERVICE" },
                                {
                                  onSuccess: () => {
                                    announcePatientCall(
                                      p.firstName,
                                      p.lastName,
                                      "CASHIER",
                                    );
                                  },
                                },
                              )
                            }
                          >
                            Call
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          className="ml-2 bg-red-700 hover:bg-red-800"
                          onClick={() => selectEncounter(entry.encounterId)}
                        >
                          Collect
                        </Button>
                      </DataTableCell>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
          ) : null}
        </ExpandablePanel>
      ) : null}

      {tab === "debts" ? (
        <ReceivablesReportPanel
          onCollect={(row) => selectEncounter(row.encounter.id, "debts")}
        />
      ) : null}

      {!embedded && tab === "expenses" ? (
        <div className="space-y-6">
          <ExpenseRecordPanel className="rounded-lg border border-border bg-card p-4 shadow-sm" />
          <ExpensesReportPanel className="rounded-lg border border-border bg-card p-4 shadow-sm" />
        </div>
      ) : null}
      {!embedded && tab === "report" ? <PaymentsReportPanel /> : null}

      <SimpleDialog
        open={result != null}
        title={result?.title ?? ""}
        primaryLabel="Done"
        onPrimary={() => setResult(null)}
        onClose={() => setResult(null)}
      >
        {result ? (
          <div className="space-y-2">
            <p>
              <strong className="text-foreground">{result.patientName}</strong>{" "}
              · {result.invoiceNumber}
            </p>
            <ul className="space-y-1 text-sm">
              {result.paidNowCents > 0 ? (
                <li>
                  Paid now:{" "}
                  <strong className="text-foreground">
                    {formatCents(result.paidNowCents)}
                  </strong>
                  {result.receipt
                    ? ` · ${paymentMethodLabel(result.receipt.method)}`
                    : ""}
                </li>
              ) : null}
              {result.waivedNowCents > 0 ? (
                <li>
                  Waived (free):{" "}
                  <strong className="text-foreground">
                    {formatCents(result.waivedNowCents)}
                  </strong>
                </li>
              ) : null}
              {result.owedCents > 0 ? (
                <li className="font-medium text-amber-800">
                  Still owes (pay later): {formatCents(result.owedCents)}
                </li>
              ) : (
                <li className="font-medium text-emerald-800">Nothing owed.</li>
              )}
              {returnStationLabel(result.returnStation) ? (
                <li>
                  Sent back to{" "}
                  <strong className="text-foreground">
                    {returnStationLabel(result.returnStation)}
                  </strong>
                </li>
              ) : null}
            </ul>
            {result.receipt ? <PrintReceipt {...result.receipt} /> : null}
          </div>
        ) : null}
      </SimpleDialog>
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
              ? "bg-muted-bg text-muted hover:bg-muted-bg"
              : "bg-muted-bg text-foreground hover:bg-muted-bg",
      )}
    >
      {label}
      <RedBadge count={badge} />
    </button>
  );
}

function PaymentPanel({
  invoice,
  returnStation,
  onDone,
  onBackToQueue,
  onOpenEncounter,
}: {
  invoice: Invoice;
  returnStation?: string | null;
  onDone: (result: CashierResult) => void;
  onBackToQueue?: () => void;
  /** Open another visit's invoice (earlier debt). */
  onOpenEncounter: (encounterId: string) => void;
}) {
  const invoiceId = invoice.id;
  const pay = useCreatePayment(invoiceId);
  const defer = useDeferInvoice(invoiceId);
  const waive = useWaiveInvoice(invoiceId);
  const balanceQuery = usePatientBalance(invoice.patientId);
  const queryClient = useQueryClient();

  const patientName = invoice.patient
    ? `${invoice.patient.firstName} ${invoice.patient.lastName}`
    : "";
  const atCashier = invoice.encounter?.status === "WAITING_PAYMENT";
  const balance = invoiceBalance(invoice);
  const dueNow = invoiceDueNow(invoice);
  const payLater = invoicePayLater(invoice);
  // At the cashier we collect what is due now; for an old debt, the whole balance.
  const target = atCashier && dueNow > 0 ? dueNow : balance;
  const payable =
    ["ISSUED", "PARTIALLY_PAID"].includes(invoice.status) && balance > 0;

  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [showMoreMethods, setShowMoreMethods] = useState(false);
  const [reference, setReference] = useState("");
  const [amountText, setAmountText] = useState(centsToEtbInput(target));
  const [deferReason, setDeferReason] = useState("");
  const [dialog, setDialog] = useState<"defer" | "waive" | null>(null);
  const [dialogReason, setDialogReason] = useState("");
  const [waiveText, setWaiveText] = useState(centsToEtbInput(target));
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null);

  // Reset the amount fields when the amount due changes (new invoice or after a part payment).
  const targetKey = `${invoiceId}:${target}`;
  const [syncedKey, setSyncedKey] = useState(targetKey);
  if (syncedKey !== targetKey) {
    setSyncedKey(targetKey);
    setAmountText(centsToEtbInput(target));
    setWaiveText(centsToEtbInput(target));
  }

  const amountCents = etbToCents(amountText);
  const amountValid =
    Number.isFinite(amountCents) && amountCents >= 1 && amountCents <= balance;
  const partial = atCashier && amountValid && amountCents < dueNow;
  const restCents = partial ? dueNow - amountCents : 0;
  const currentLines = unpaidInvoiceLines(invoice);
  const otherDebts =
    balanceQuery.data?.invoices.filter((i) => i.id !== invoiceId) ?? [];
  const otherDebtCents = otherDebts.reduce((s, i) => s + i.balanceCents, 0);
  const needsReference =
    method === PaymentMethod.CARD ||
    method === PaymentMethod.TELEBIRR ||
    method === PaymentMethod.BANK_TRANSFER;
  const busy = pay.isPending || defer.isPending || waive.isPending;

  async function refreshed() {
    return queryClient.fetchQuery({
      queryKey: ["invoices", invoiceId],
      queryFn: () => fetchInvoice(invoiceId),
    });
  }

  function announce(fullyPaid: boolean) {
    if (!atCashier) return;
    announceClinic(
      fullyPaid
        ? buildPaymentCompleteMessage(patientName, returnStation)
        : buildReturnToStationMessage(patientName, returnStation),
    );
  }

  function takePayment(afterPayment: "RELEASE" | "WAIT" | undefined) {
    if (!amountValid) return;
    pay.mutate(
      {
        amountCents,
        method,
        referenceNumber: reference || undefined,
        afterPayment,
        deferReason:
          afterPayment === "RELEASE" && partial ? deferReason.trim() : undefined,
      },
      {
        onSuccess: async (payment) => {
          const inv = await refreshed();
          const receipt: ReceiptData = {
            paymentNumber: payment.paymentNumber,
            invoiceNumber: invoice.invoiceNumber,
            patientName,
            amountCents: payment.amountCents,
            method: payment.method,
            totalCents: inv.totalCents,
            paidSoFarCents: inv.paidCents,
            waivedCents: inv.waivedCents,
            balanceCents: invoiceBalance(inv),
            payLaterCents: invoicePayLater(inv),
          };
          setLastReceipt(receipt);
          setReference("");
          setDeferReason("");
          const owed = invoiceBalance(inv);
          const left =
            (atCashier && (invoiceDueNow(inv) === 0 || afterPayment === "RELEASE")) ||
            (!atCashier && owed === 0);
          if (!left) return; // partial + keep waiting: stay on this panel
          announce(owed === 0);
          onDone({
            title: atCashier
              ? owed === 0
                ? "Paid in full"
                : "Part paid - rest pay later"
              : owed === 0
                ? "Debt fully paid"
                : "Debt payment recorded",
            patientName,
            invoiceNumber: invoice.invoiceNumber,
            returnStation: atCashier ? (returnStation ?? null) : null,
            paidNowCents: payment.amountCents,
            waivedNowCents: 0,
            owedCents: owed,
            receipt,
          });
        },
      },
    );
  }

  function confirmDefer() {
    const reason = dialogReason.trim();
    if (reason.length < 3) {
      toast.error("Write a short reason for pay later");
      return;
    }
    defer.mutate(reason, {
      onSuccess: async () => {
        const inv = await refreshed();
        setDialog(null);
        setDialogReason("");
        announce(false);
        onDone({
          title: "Pay later approved",
          patientName,
          invoiceNumber: invoice.invoiceNumber,
          returnStation: returnStation ?? null,
          paidNowCents: 0,
          waivedNowCents: 0,
          owedCents: invoiceBalance(inv),
        });
      },
    });
  }

  function confirmWaive() {
    const reason = dialogReason.trim();
    const cents = etbToCents(waiveText);
    if (!Number.isFinite(cents) || cents < 1 || cents > balance) {
      toast.error(`Waive amount must be between 0.01 and ${formatCents(balance)}`);
      return;
    }
    if (reason.length < 3) {
      toast.error("Write a short reason for waiving");
      return;
    }
    waive.mutate(
      { amountCents: cents, reason },
      {
        onSuccess: async () => {
          const inv = await refreshed();
          setDialog(null);
          setDialogReason("");
          const owed = invoiceBalance(inv);
          const stillDue = invoiceDueNow(inv);
          if (atCashier && stillDue > 0) {
            toast.success(`Waived ${formatCents(cents)} - ${formatCents(stillDue)} still due`);
            return;
          }
          if (!atCashier && owed > 0) {
            toast.success(`Waived ${formatCents(cents)} - still owes ${formatCents(owed)}`);
            return;
          }
          announce(owed === 0);
          onDone({
            title: owed === 0 ? "Waived - nothing owed" : "Waived - rest pay later",
            patientName,
            invoiceNumber: invoice.invoiceNumber,
            returnStation: atCashier ? (returnStation ?? null) : null,
            paidNowCents: 0,
            waivedNowCents: cents,
            owedCents: owed,
          });
        },
      },
    );
  }

  if (!payable) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {invoiceStateBadge(invoice)}
          <p className="text-sm text-muted">
            Invoice {invoice.invoiceNumber} has nothing to collect.
          </p>
        </div>
        {lastReceipt ? (
          <div className="mt-3">
            <PrintReceipt {...lastReceipt} />
          </div>
        ) : null}
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
    <div className="space-y-4 rounded-lg border border-red-200 bg-card p-5 shadow-sm ring-1 ring-red-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-foreground">
            {patientName || invoice.invoiceNumber}
          </p>
          <p className="text-sm text-muted">
            {invoice.invoiceNumber}
            {atCashier && returnStationLabel(returnStation)
              ? ` · then ${returnStationLabel(returnStation)}`
              : ""}
            {!atCashier ? " · earlier visit (debt)" : ""}
          </p>
          <div className="mt-1.5">{invoiceStateBadge(invoice)}</div>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-muted">
            {atCashier ? "Due now" : "Owed"}
          </p>
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {formatCents(target)}
          </p>
          <p className="mt-0.5 text-xs text-muted tabular-nums">
            Total {formatCents(invoice.totalCents)} · paid{" "}
            {formatCents(invoice.paidCents)}
            {invoice.waivedCents > 0
              ? ` · waived ${formatCents(invoice.waivedCents)}`
              : ""}
          </p>
          {atCashier && payLater > 0 ? (
            <p className="text-xs font-medium text-amber-800">
              + {formatCents(payLater)} earlier pay later on this visit
            </p>
          ) : null}
        </div>
      </div>

      {otherDebtCents > 0 ? (
        <div
          className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
          role="status"
        >
          <p className="font-semibold">
            Also owes {formatCents(otherDebtCents)} from earlier visits
          </p>
          <ul className="mt-1 space-y-1">
            {otherDebts.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 text-xs">
                <span>
                  {d.invoiceNumber} · {d.encounter.encounterNumber} ·{" "}
                  <strong>{formatCents(d.balanceCents)}</strong>
                </span>
                <button
                  type="button"
                  className="font-medium underline"
                  onClick={() => onOpenEncounter(d.encounter.id)}
                >
                  Open to collect
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {currentLines.length > 0 ? (
        <ul className="divide-y divide-border rounded-md border border-border text-sm">
          {currentLines.map((line) => (
            <li
              key={line.id}
              className="flex items-start justify-between gap-2 px-3 py-2"
            >
              <span className="text-foreground">{line.description}</span>
              <span className="shrink-0 font-medium tabular-nums text-foreground">
                {formatCents(line.remainingCents)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="space-y-4 border-t border-border pt-4">
        <div>
          <p className="mb-2 text-xs font-medium text-muted">Payment method</p>
          <div className="flex flex-wrap gap-2">
            {PRIMARY_METHODS.map((m) => (
              <button
                key={m}
                type="button"
                className={cn(
                  "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                  method === m
                    ? "border-teal-700 bg-teal-800 text-white"
                    : "border-border bg-card text-foreground hover:bg-muted-bg",
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
                  : "border-border bg-card text-foreground hover:bg-muted-bg",
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
                      : "border-border text-foreground",
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
            <Label htmlFor="cashier-amount" className="text-xs">
              Amount received (ETB)
            </Label>
            <Input
              id="cashier-amount"
              inputMode="decimal"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              className="mt-1 text-base font-semibold tabular-nums"
              aria-invalid={!amountValid}
            />
            <p className="mt-1 text-2xs text-muted">
              {amountValid
                ? partial
                  ? `Part payment · ${formatCents(restCents)} left`
                  : amountCents > target
                    ? "Includes earlier pay-later debt"
                    : "Full amount"
                : `Enter 0.01 – ${formatCents(balance)}`}
            </p>
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
                className="mt-1"
              />
            </div>
          ) : null}
        </div>

        {partial ? (
          <div className="space-y-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            <p className="font-semibold">
              Part payment: {formatCents(amountCents)} now,{" "}
              {formatCents(restCents)} left. What next?
            </p>
            <div>
              <Label htmlFor="defer-reason" className="text-xs">
                Reason for paying the rest later (needed to send back)
              </Label>
              <Input
                id="defer-reason"
                value={deferReason}
                onChange={(e) => setDeferReason(e.target.value)}
                placeholder="e.g. will bring the rest tomorrow"
                className="mt-1"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={busy || deferReason.trim().length < 3}
                onClick={() => takePayment("RELEASE")}
              >
                {pay.isPending
                  ? "Processing…"
                  : `Take ${formatCents(amountCents)} · send back (${formatCents(restCents)} pay later)`}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => takePayment("WAIT")}
              >
                Take {formatCents(amountCents)} · keep waiting
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {!partial ? (
            <Button
              type="button"
              size="lg"
              disabled={busy || !amountValid}
              onClick={() => takePayment(undefined)}
            >
              {pay.isPending
                ? "Processing…"
                : `Take payment · ${formatCents(amountValid ? amountCents : 0)}`}
            </Button>
          ) : null}
          {atCashier && dueNow > 0 ? (
            <Button
              type="button"
              size="lg"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setDialogReason("");
                setDialog("defer");
              }}
            >
              Pay later
            </Button>
          ) : null}
          <Button
            type="button"
            size="lg"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setDialogReason("");
              setWaiveText(centsToEtbInput(target));
              setDialog("waive");
            }}
          >
            Waive / free
          </Button>
          {onBackToQueue ? (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={onBackToQueue}
            >
              Back
            </Button>
          ) : null}
        </div>

        {lastReceipt ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted-bg px-3 py-2 text-sm">
            <span className="text-foreground">
              Last payment {lastReceipt.paymentNumber} ·{" "}
              {formatCents(lastReceipt.amountCents)}
            </span>
            <PrintReceipt {...lastReceipt} />
          </div>
        ) : null}
      </div>

      <SimpleDialog
        open={dialog === "defer"}
        title="Pay later"
        primaryLabel={defer.isPending ? "Saving…" : "Approve pay later"}
        onPrimary={confirmDefer}
        secondaryLabel="Cancel"
        onSecondary={() => setDialog(null)}
        onClose={() => setDialog(null)}
      >
        <div className="space-y-3">
          <p>
            <strong className="text-foreground">{patientName}</strong> leaves
            without paying. <strong>{formatCents(dueNow)}</strong> is recorded
            as debt and they go back
            {returnStationLabel(returnStation)
              ? ` to ${returnStationLabel(returnStation)}`
              : ""}
            .
          </p>
          <div>
            <Label htmlFor="defer-dialog-reason" className="text-xs">
              Reason (required)
            </Label>
            <Textarea
              id="defer-dialog-reason"
              value={dialogReason}
              onChange={(e) => setDialogReason(e.target.value)}
              placeholder="e.g. no money today, will pay on next visit"
              className="mt-1 min-h-[64px]"
            />
          </div>
        </div>
      </SimpleDialog>

      <SimpleDialog
        open={dialog === "waive"}
        title="Waive / free"
        primaryLabel={waive.isPending ? "Saving…" : "Waive"}
        onPrimary={confirmWaive}
        secondaryLabel="Cancel"
        onSecondary={() => setDialog(null)}
        onClose={() => setDialog(null)}
      >
        <div className="space-y-3">
          <p>
            The waived amount is forgiven and <strong>not owed</strong>. Up to{" "}
            {formatCents(balance)}.
          </p>
          <div>
            <Label htmlFor="waive-amount" className="text-xs">
              Amount to waive (ETB)
            </Label>
            <Input
              id="waive-amount"
              inputMode="decimal"
              value={waiveText}
              onChange={(e) => setWaiveText(e.target.value)}
              className="mt-1 tabular-nums"
            />
          </div>
          <div>
            <Label htmlFor="waive-reason" className="text-xs">
              Reason (required)
            </Label>
            <Textarea
              id="waive-reason"
              value={dialogReason}
              onChange={(e) => setDialogReason(e.target.value)}
              placeholder="e.g. poor patient, staff family, approved by director"
              className="mt-1 min-h-[64px]"
            />
          </div>
        </div>
      </SimpleDialog>
    </div>
  );
}
