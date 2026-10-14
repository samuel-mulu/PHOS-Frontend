"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingBlock } from "@/components/shared/state-blocks";
import { SimpleDialog } from "@/components/shared/simple-dialog";
import { labOrderStatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/format/money";
import { formatWaitingSince } from "@/lib/format/wait-time";
import type { LabOrder } from "@/features/laboratory/api";
import {
  useCreateLabOrder,
  useLabOrders,
  useLabTests,
} from "@/features/laboratory/hooks";
import { EncounterPriority } from "@/types/encounter";
import { LabOrderStatus } from "@/types/lab";
import { sortByCreatedAtDesc } from "@/lib/queues/sort";
import { LabPaper, labItemsToPaperLines } from "@/components/laboratory/lab-paper";
import { groupByPanel, uniquePanelLabels } from "@/lib/lab/panels";

const WAITING_STATUSES: LabOrderStatus[] = [
  LabOrderStatus.ORDERED,
  LabOrderStatus.RECEIVED,
  LabOrderStatus.PROCESSING,
  LabOrderStatus.RESULT_ENTERED,
];

/** Full verified result — primary thing the doctor needs to see. */
function ReadyResultCard({ order }: { order: LabOrder }) {
  return (
    <article className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {order.orderNumber}
          </p>
          <p className="text-xs text-slate-500">
            Ready {format(new Date(order.createdAt), "dd MMM HH:mm")} ·{" "}
            {order.priority}
          </p>
        </div>
        {labOrderStatusBadge(order.status)}
      </div>

      <div className="mt-3">
        <LabPaper mode="view" lines={labItemsToPaperLines(order.items)} />
      </div>

      {order.clinicalNotes ? (
        <p className="mt-2 text-xs text-slate-500">
          Order notes: {order.clinicalNotes}
        </p>
      ) : null}
    </article>
  );
}

function WaitingOrderCard({
  order,
  awaitingPayment,
}: {
  order: LabOrder;
  awaitingPayment?: boolean;
}) {
  const statusHint = awaitingPayment
    ? "Waiting for payment, then lab"
    : order.status === LabOrderStatus.ORDERED
      ? "Waiting for lab to receive"
      : order.status === LabOrderStatus.RESULT_ENTERED
        ? "Lab entering / verifying"
        : "In progress at lab";

  return (
    <article className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-900">
            {order.orderNumber}
          </p>
          <p className="text-xs text-slate-500">
            {uniquePanelLabels(order.items.map((i) => i.labTest))} · Sent{" "}
            {format(new Date(order.createdAt), "dd MMM HH:mm")}
          </p>
          <p className="mt-0.5 text-xs text-amber-900">{statusHint}</p>
          {awaitingPayment ? (
            <p className="mt-0.5 text-xs font-semibold text-amber-950">
              Pending {formatWaitingSince(order.createdAt)}
            </p>
          ) : null}
        </div>
        {labOrderStatusBadge(order.status)}
      </div>
    </article>
  );
}

export function DoctorLabOrdersPanel({
  consultationId,
  isFinalized,
  preferResults: _preferResults,
  encounterStatus,
  paymentReturnStation,
  onNeedDraft,
  onSentToLab,
}: {
  consultationId?: string;
  isFinalized: boolean;
  /** Kept for callers; results + pending now show together. */
  preferResults?: boolean;
  encounterStatus?: string;
  paymentReturnStation?: string | null;
  onNeedDraft: () => void;
  onSentToLab: () => void;
}) {
  const tests = useLabTests();
  const labs = useLabOrders();
  const create = useCreateLabOrder(consultationId ?? "");
  const [selected, setSelected] = useState<string[]>([]);
  const [priority, setPriority] = useState<EncounterPriority>(
    EncounterPriority.ROUTINE,
  );
  const [notes, setNotes] = useState("");
  const [orderOpen, setOrderOpen] = useState(false);
  const [cashierLabOpen, setCashierLabOpen] = useState(false);
  const awaitingCashierLab =
    encounterStatus === "WAITING_PAYMENT" && paymentReturnStation === "LAB";

  const myOrders = useMemo(
    () =>
      sortByCreatedAtDesc(
        (labs.data ?? []).filter((o) => o.consultationId === consultationId),
      ),
    [labs.data, consultationId],
  );

  const waiting = useMemo(
    () => myOrders.filter((o) => WAITING_STATUSES.includes(o.status)),
    [myOrders],
  );
  const ready = useMemo(
    () => myOrders.filter((o) => o.status === LabOrderStatus.VERIFIED),
    [myOrders],
  );
  const catalog = tests.data ?? [];
  const panels = useMemo(
    () =>
      groupByPanel(
        catalog,
        (t) => t.category,
        (t) => t.sortOrder,
      ),
    [catalog],
  );
  const cashierLabLines = useMemo(
    () =>
      selected
        .map((id) => catalog.find((t) => t.id === id))
        .filter((t): t is NonNullable<typeof t> => Boolean(t)),
    [selected, catalog],
  );
  const cashierLabGroups = useMemo(
    () =>
      groupByPanel(
        cashierLabLines,
        (t) => t.category,
        (t) => t.sortOrder,
      ),
    [cashierLabLines],
  );
  const cashierLabTotalCents = cashierLabLines.reduce(
    (sum, t) => sum + t.priceCents,
    0,
  );

  function sendCashierLab() {
    if (!selected.length || create.isPending || cashierLabTotalCents < 1) return;
    create.mutate(
      {
        labTestIds: selected,
        priority,
        clinicalNotes: notes || undefined,
        billFirst: true,
      },
      {
        onSuccess: () => {
          setSelected([]);
          setNotes("");
          setOrderOpen(false);
          setCashierLabOpen(false);
        },
      },
    );
  }

  useEffect(() => {
    // Open order form when there is nothing to review yet.
    if (ready.length === 0 && waiting.length === 0 && !isFinalized) {
      setOrderOpen(true);
    }
  }, [ready.length, waiting.length, isFinalized]);

  if (!consultationId) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-600">Save consult draft first.</p>
        <Button type="button" className="mt-2" onClick={onNeedDraft}>
          Save draft
        </Button>
      </div>
    );
  }

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function togglePanel(ids: string[]) {
    setSelected((prev) => {
      const allOn = ids.length > 0 && ids.every((id) => prev.includes(id));
      if (allOn) return prev.filter((id) => !ids.includes(id));
      return [...new Set([...prev, ...ids])];
    });
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-800">Laboratory</h2>
        <div className="flex flex-wrap gap-1.5">
          {ready.length > 0 ? (
            <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
              {ready.length} result{ready.length === 1 ? "" : "s"} ready
            </span>
          ) : null}
          {waiting.length > 0 ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-950">
              {waiting.length} pending
            </span>
          ) : null}
        </div>
      </div>

      {awaitingCashierLab ? (
        <p
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
          role="status"
        >
          Patient is at cashier for lab payment. After pay they go to lab.
          Results return here when ready.
        </p>
      ) : null}

      {ready.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Results from lab
          </h3>
          {ready.map((order) => (
            <ReadyResultCard key={order.id} order={order} />
          ))}
        </section>
      ) : null}

      {waiting.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Pending at lab
          </h3>
          {waiting.map((order) => (
            <WaitingOrderCard
              key={order.id}
              order={order}
              awaitingPayment={
                awaitingCashierLab && order.status === LabOrderStatus.ORDERED
              }
            />
          ))}
        </section>
      ) : null}

      {!isFinalized && !awaitingCashierLab ? (
        <section
          className={
            ready.length > 0 || waiting.length > 0
              ? "space-y-2 border-t border-slate-100 pt-3"
              : "space-y-2"
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Order tests
            </h3>
            {ready.length > 0 || waiting.length > 0 ? (
              <Button
                type="button"
                size="sm"
                variant={orderOpen ? "secondary" : "outline"}
                onClick={() => setOrderOpen((v) => !v)}
              >
                {orderOpen ? "Hide order form" : "Order more tests"}
              </Button>
            ) : null}
          </div>
          {orderOpen ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-slate-600">
                Tap a panel to order its tests
              </p>
              {tests.isLoading ? (
                <LoadingBlock label="Loading tests" />
              ) : null}
              {tests.isSuccess && catalog.length === 0 ? (
                <p className="text-sm text-amber-800">
                  No lab tests in catalog. Ask admin to add tests.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {panels.map((panel) => {
                  const ids = panel.items.map((t) => t.id);
                  const selectedCount = ids.filter((id) =>
                    selected.includes(id),
                  ).length;
                  const allOn =
                    ids.length > 0 && selectedCount === ids.length;
                  const someOn = selectedCount > 0 && !allOn;
                  return (
                    <button
                      key={panel.category}
                      type="button"
                      onClick={() => togglePanel(ids)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                        allOn
                          ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                          : someOn
                            ? "border-emerald-500 bg-emerald-100 text-emerald-950"
                            : "border-slate-200 bg-slate-50 text-slate-800 hover:border-emerald-400 hover:bg-emerald-50",
                      )}
                    >
                      {panel.label}
                      {someOn ? ` (${selectedCount})` : null}
                    </button>
                  );
                })}
              </div>
              {cashierLabLines.length > 0 ? (
                <ul className="max-h-36 space-y-1 overflow-y-auto rounded-md border border-slate-100 bg-slate-50/80 p-2 text-xs">
                  {cashierLabGroups.map((group) => (
                    <li key={group.category}>
                      <p className="font-semibold text-slate-600">
                        {group.label}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {group.items.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => toggle(t.id)}
                            className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[11px] text-slate-800 hover:border-red-300 hover:text-red-800"
                            title="Remove from order"
                          >
                            {t.name} ×
                          </button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label className="mb-1 block text-xs">Priority</Label>
                  <select
                    className="h-10 w-full rounded-md border border-slate-200 px-2 text-sm"
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as EncounterPriority)
                    }
                  >
                    {Object.values(EncounterPriority).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="mb-1 block text-xs">Clinical notes</Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  disabled={!selected.length || create.isPending}
                  onClick={() =>
                    create.mutate(
                      {
                        labTestIds: selected,
                        priority,
                        clinicalNotes: notes || undefined,
                      },
                      {
                        onSuccess: () => {
                          setSelected([]);
                          setNotes("");
                          setOrderOpen(false);
                          onSentToLab();
                        },
                      },
                    )
                  }
                >
                  {create.isPending && !create.variables?.billFirst
                    ? "Sending…"
                    : `Send lab order (${selected.length})`}
                </Button>
                <Button
                  type="button"
                  className="bg-emerald-700 hover:bg-emerald-800"
                  disabled={!selected.length || create.isPending}
                  onClick={() => setCashierLabOpen(true)}
                >
                  {create.isPending && create.variables?.billFirst
                    ? "Sending…"
                    : `Send to cashier — lab (${selected.length})`}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Send lab order goes straight to lab. Send to cashier — lab:
                patient pays first, then lab. Results come back to you.
              </p>
            </div>
          ) : null}
        </section>
      ) : (
        <p className="text-sm text-slate-500">
          Consultation finalized — new lab orders are closed.
        </p>
      )}

      <SimpleDialog
        open={cashierLabOpen}
        title="Send to cashier — lab"
        primaryLabel={
          create.isPending ? "Sending…" : "Send to cashier"
        }
        secondaryLabel="Cancel"
        onSecondary={() => setCashierLabOpen(false)}
        onClose={() => {
          if (!create.isPending) setCashierLabOpen(false);
        }}
        onPrimary={sendCashierLab}
      >
        <p className="text-slate-600">
          Patient pays this amount at cashier / front desk, then goes to lab.
        </p>
        <ul className="mt-3 space-y-2">
          {cashierLabGroups.map((group) => {
            const total = group.items.reduce((sum, t) => sum + t.priceCents, 0);
            return (
              <li key={group.category} className="text-sm">
                <div className="flex items-center justify-between gap-3 font-medium">
                  <span>{group.label}</span>
                  <span className="shrink-0 tabular-nums">
                    {formatCents(total)}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {group.items.map((t) => t.name).join(", ")}
                </p>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-base font-semibold text-slate-900">
          Total to collect: {formatCents(cashierLabTotalCents)}
        </p>
        {cashierLabTotalCents < 1 ? (
          <p className="mt-2 text-xs text-amber-800">
            Selected tests have no price. Set prices or send to lab directly.
          </p>
        ) : null}
      </SimpleDialog>
    </div>
  );
}

export function useDoctorLabOrderCounts(consultationId?: string) {
  const labs = useLabOrders();
  return useMemo(() => {
    const mine = (labs.data ?? []).filter(
      (o) => o.consultationId === consultationId,
    );
    return {
      waiting: mine.filter((o) => WAITING_STATUSES.includes(o.status)).length,
      ready: mine.filter((o) => o.status === LabOrderStatus.VERIFIED).length,
    };
  }, [labs.data, consultationId]);
}
