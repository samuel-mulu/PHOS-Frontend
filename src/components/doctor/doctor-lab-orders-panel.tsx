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
import type { LabOrder } from "@/features/laboratory/api";
import {
  useCreateLabOrder,
  useLabOrders,
  useLabTests,
} from "@/features/laboratory/hooks";
import { EncounterPriority } from "@/types/encounter";
import { LabOrderStatus } from "@/types/lab";
import { sortByCreatedAtDesc } from "@/lib/queues/sort";

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

      <ul className="mt-3 space-y-2">
        {order.items.map((item) => (
          <li
            key={item.id}
            className="rounded-md border border-emerald-100 bg-white px-3 py-2.5"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {item.labTest.code} — {item.labTest.name}
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {item.result?.value ?? "—"}
              {item.result?.unit || item.labTest.unit ? (
                <span className="ml-1 text-sm font-normal text-slate-600">
                  {item.result?.unit ?? item.labTest.unit}
                </span>
              ) : null}
            </p>
            <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-600">
              {item.result?.flag ? (
                <span
                  className={cn(
                    "font-semibold",
                    item.result.flag === "CRITICAL" ||
                      item.result.flag === "ABNORMAL"
                      ? "text-red-700"
                      : item.result.flag === "HIGH" ||
                          item.result.flag === "LOW"
                        ? "text-amber-800"
                        : "text-emerald-800",
                  )}
                >
                  {item.result.flag}
                </span>
              ) : null}
              {item.labTest.referenceRange ? (
                <span>Ref: {item.labTest.referenceRange}</span>
              ) : null}
            </div>
            {item.result?.notes ? (
              <p className="mt-1 text-xs text-slate-600">{item.result.notes}</p>
            ) : null}
          </li>
        ))}
      </ul>

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
            {order.items.map((i) => i.labTest.code).join(", ")} · Sent{" "}
            {format(new Date(order.createdAt), "dd MMM HH:mm")}
          </p>
          <p className="mt-0.5 text-xs text-amber-900">{statusHint}</p>
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
  const cashierLabLines = useMemo(() => {
    const catalog = tests.data ?? [];
    return selected
      .map((id) => catalog.find((t) => t.id === id))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));
  }, [selected, tests.data]);
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

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Results from lab
        </h3>
        {ready.length > 0 ? (
          ready.map((order) => (
            <ReadyResultCard key={order.id} order={order} />
          ))
        ) : (
          <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
            No verified results back yet for this visit.
          </p>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Pending at lab
        </h3>
        {waiting.length > 0 ? (
          waiting.map((order) => (
            <WaitingOrderCard
              key={order.id}
              order={order}
              awaitingPayment={
                awaitingCashierLab && order.status === LabOrderStatus.ORDERED
              }
            />
          ))
        ) : (
          <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
            Nothing pending at lab right now.
          </p>
        )}
      </section>

      {!isFinalized ? (
        <section className="space-y-2 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Order tests
            </h3>
            <Button
              type="button"
              size="sm"
              variant={orderOpen ? "secondary" : "outline"}
              onClick={() => setOrderOpen((v) => !v)}
            >
              {orderOpen ? "Hide order form" : "Order more tests"}
            </Button>
          </div>
          {orderOpen ? (
            <div className="space-y-3">
              <p className="text-xs font-medium text-slate-600">
                Tap tests to order
              </p>
              {tests.isLoading ? (
                <LoadingBlock label="Loading tests" />
              ) : null}
              {tests.isSuccess && (tests.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-amber-800">
                  No lab tests in catalog. Ask admin to add tests.
                </p>
              ) : null}
              <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto rounded-md border border-slate-100 p-2">
                {tests.data?.map((t) => {
                  const on = selected.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggle(t.id)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-left text-xs font-medium transition-colors",
                        on
                          ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                          : "border-emerald-200 bg-emerald-50 text-emerald-950 hover:border-emerald-400 hover:bg-emerald-100",
                      )}
                      title={
                        t.category ? `${t.category} · ${t.code}` : t.code
                      }
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
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
        <ul className="mt-3 space-y-1.5">
          {cashierLabLines.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span>{t.name}</span>
              <span className="shrink-0 font-medium tabular-nums">
                {formatCents(t.priceCents)}
              </span>
            </li>
          ))}
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
