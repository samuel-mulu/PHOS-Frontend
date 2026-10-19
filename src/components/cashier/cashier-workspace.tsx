"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchInvoice } from "@/features/billing/api";
import { SimpleDialog } from "@/components/shared/simple-dialog";
import {
  announcePatientCall,
  buildPaymentCompleteMessage,
  announceClinic,
} from "@/lib/voice/announce";
import { useSearchParams } from "next/navigation";
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
import { useCreatePayment } from "@/features/payments/hooks";
import { PrintReceipt } from "@/components/print/print-receipt";
import { useQueue, useUpdateQueueEntry } from "@/features/queues/hooks";
import { PaymentMethod } from "@/types/finance";
import { formatCents } from "@/lib/format/money";
import { formatWaitingSince } from "@/lib/format/wait-time";
import { paymentMethodLabel } from "@/lib/format/payment-method";
import { QueueStation } from "@/types/encounter";
import { invoiceStatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { sortByEnteredAtDesc } from "@/lib/queues/sort";
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

type CashierTab = "waiting" | "report";

function unpaidInvoiceLines(
  items: Array<{ id: string; description: string; totalCents: number }>,
  paidCents: number,
) {
  let remainingPaid = Math.max(0, paidCents);
  const due: Array<{ id: string; description: string; dueCents: number }> = [];
  for (const item of items) {
    if (remainingPaid >= item.totalCents) {
      remainingPaid -= item.totalCents;
      continue;
    }
    const uncovered = item.totalCents - remainingPaid;
    remainingPaid = 0;
    if (uncovered > 0) {
      due.push({
        id: item.id,
        description: item.description,
        dueCents: uncovered,
      });
    }
  }
  return due;
}

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

function RedBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function CashierWorkspace({
  embedded,
  onInvoiceFullyPaid,
}: {
  embedded?: boolean;
  onInvoiceFullyPaid?: (invoiceId: string) => void;
} = {}) {
  const searchParams = useSearchParams();
  const encounterFromUrl = searchParams.get("encounterId") ?? "";
  const invoiceFromUrl = searchParams.get("invoiceId") ?? "";
  const [selectedEncounterId, setSelectedEncounterId] = useState(encounterFromUrl);
  const [tab, setTab] = useState<CashierTab>("waiting");

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

  function selectEncounter(id: string) {
    setSelectedEncounterId(id);
    setTab("waiting");
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

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {!embedded ? (
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Cashier</h1>
          <p className="text-sm text-slate-600">
            Patients sent to pay (visit fee, doctor, lab). Collect, then they
            go back automatically.
          </p>
        </div>
      ) : null}

      <nav
        className="flex flex-wrap gap-2 border-b border-slate-200 pb-2"
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

      {tab === "waiting" && collecting ? (
        <section className="space-y-3">
          {encounterQuery.isLoading || (invoiceId && invoice.isLoading) ? (
            <LoadingBlock label="Loading amount due" />
          ) : null}
          {invoice.data ? (
            <PaymentPanel
              invoiceId={invoice.data.id}
              invoiceNumber={invoice.data.invoiceNumber}
              patientName={
                invoice.data.patient
                  ? `${invoice.data.patient.firstName} ${invoice.data.patient.lastName}`
                  : ""
              }
              balance={invoice.data.totalCents - invoice.data.paidCents}
              paidCents={invoice.data.paidCents}
              status={invoice.data.status}
              items={invoice.data.items}
              payments={invoice.data.payments}
              returnStation={returnStation}
              onFullyPaid={(id, dest) => {
                const label = returnStationLabel(dest);
                toast.success(
                  label
                    ? `Paid — patient sent back to ${label}`
                    : "Paid in full",
                );
                onInvoiceFullyPaid?.(id);
                clearCollect();
              }}
              onBackToQueue={clearCollect}
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
              <h2 className="text-sm font-semibold text-slate-900">
                Waiting to pay
              </h2>
              <p className="text-xs font-normal text-slate-500">
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
                        <p className="text-xs text-slate-500">
                          {p.patientNumber} · {entry.encounter.encounterNumber}
                        </p>
                      </DataTableCell>
                      <DataTableCell>
                        <span className="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-900">
                          {why}
                        </span>
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

function PaymentPanel({
  invoiceId,
  invoiceNumber,
  patientName,
  balance,
  paidCents,
  status,
  items,
  payments,
  returnStation,
  onFullyPaid,
  onBackToQueue,
}: {
  invoiceId: string;
  invoiceNumber: string;
  patientName: string;
  balance: number;
  paidCents: number;
  status: string;
  items: Array<{ id: string; description: string; totalCents: number }>;
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
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [showMoreMethods, setShowMoreMethods] = useState(false);
  const [reference, setReference] = useState("");
  const [paidDialogOpen, setPaidDialogOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<{
    paymentNumber: string;
    amountCents: number;
    method: string;
  } | null>(null);

  const payable = ["ISSUED", "PARTIALLY_PAID"].includes(status) && balance > 0;
  const amountCents = balance;
  const currentLines = unpaidInvoiceLines(items, paidCents);
  const needsReference =
    method === PaymentMethod.CARD ||
    method === PaymentMethod.TELEBIRR ||
    method === PaymentMethod.BANK_TRANSFER;

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
          {returnStationLabel(returnStation) ? (
            <p className="text-sm text-slate-500">
              Then {returnStationLabel(returnStation)}
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            To collect
          </p>
          <p className="text-2xl font-semibold tabular-nums text-slate-900">
            {formatCents(balance)}
          </p>
        </div>
      </div>

      {payable && currentLines.length > 0 ? (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 text-sm">
          {currentLines.map((line) => (
            <li
              key={line.id}
              className="flex items-start justify-between gap-2 px-3 py-2"
            >
              <span className="text-slate-800">{line.description}</span>
              <span className="shrink-0 font-medium tabular-nums text-slate-900">
                {formatCents(line.dueCents)}
              </span>
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

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="lg"
              disabled={
                pay.isPending || amountCents < 1 || amountCents > balance
              }
              onClick={() =>
                pay.mutate(
                  {
                    amountCents,
                    method,
                    referenceNumber: reference || undefined,
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
                          buildPaymentCompleteMessage(
                            patientName,
                            returnStation,
                          ),
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
    </div>
  );
}
