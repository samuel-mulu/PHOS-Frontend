"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SuggestingInput } from "@/components/shared/suggesting-field";
import { rememberLabClinicalNotes } from "@/lib/field-memory/remember";
import { useAuthStore } from "@/stores/auth-store";
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
import { sortByCreatedAt } from "@/lib/queues/sort";
import { useDateSort } from "@/lib/queues/use-date-sort";
import { DateSortToggle } from "@/components/shared/date-sort-toggle";
import { PrintFullLabActivity } from "@/components/print/print-full-lab-activity";
import { PrintPatientLabReport } from "@/components/print/print-patient-lab-report";
import { LabPaper, labItemsToPaperLines } from "@/components/laboratory/lab-paper";
import { groupByPanel, uniquePanelLabels } from "@/lib/lab/panels";

const WAITING_STATUSES: LabOrderStatus[] = [
  LabOrderStatus.ORDERED,
  LabOrderStatus.RECEIVED,
  LabOrderStatus.PROCESSING,
  LabOrderStatus.RESULT_ENTERED,
];

/** Full verified result - primary thing the doctor needs to see. */
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
  patientId,
  patientLabel,
  isFinalized,
  preferResults: _preferResults,
  encounterStatus,
  paymentReturnStation,
  onNeedDraft,
  onSentToLab,
}: {
  consultationId?: string;
  /** When set (consultation), patient lab report skips search. */
  patientId?: string;
  patientLabel?: string;
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
  const { direction, setDirection } = useDateSort("latest");
  const [selected, setSelected] = useState<string[]>([]);
  /** Which panel list is open - tests start unchecked; doctor taps only what is needed. */
  const [openCategory, setOpenCategory] = useState<string | null>(null);
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
      sortByCreatedAt(
        (labs.data ?? []).filter((o) => o.consultationId === consultationId),
        direction,
      ),
    [labs.data, consultationId, direction],
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
  const openPanel = useMemo(
    () => panels.find((panel) => panel.category === openCategory) ?? null,
    [panels, openCategory],
  );
  const cashierLabTotalCents = cashierLabLines.reduce(
    (sum, t) => sum + t.priceCents,
    0,
  );

  function rememberClinicalNotes() {
    rememberLabClinicalNotes(useAuthStore.getState().user?.id, notes);
  }

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
          rememberClinicalNotes();
          setSelected([]);
          setOpenCategory(null);
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

  function toggleTest(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function selectAllInPanel(ids: string[]) {
    setSelected((prev) => [...new Set([...prev, ...ids])]);
  }

  function clearPanelSelection(ids: string[]) {
    setSelected((prev) => prev.filter((id) => !ids.includes(id)));
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-800">Laboratory</h2>
        <div className="flex flex-wrap items-center gap-2">
          <PrintPatientLabReport
            patientId={patientId}
            patientLabel={patientLabel}
            triggerLabel="Patient lab report"
          />
          <PrintFullLabActivity />
          {(ready.length > 0 || waiting.length > 0) && (
            <DateSortToggle value={direction} onChange={setDirection} />
          )}
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
              <p className="text-xs text-slate-600">
                Open a panel, then tap only the tests you need (e.g. 3 of 10).
                Use <span className="font-medium">Order all</span> only when you
                want the full panel.
              </p>
              {tests.isLoading ? (
                <LoadingBlock label="Loading tests" />
              ) : null}
              {tests.isSuccess && catalog.length === 0 ? (
                <p className="text-sm text-amber-800">
                  No lab tests in catalog. Ask admin to add tests.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-1.5">
                {panels.map((panel) => {
                  const ids = panel.items.map((t) => t.id);
                  const selectedCount = ids.filter((id) =>
                    selected.includes(id),
                  ).length;
                  const isOpen = openCategory === panel.category;
                  return (
                    <button
                      key={panel.category}
                      type="button"
                      onClick={() => setOpenCategory(panel.category)}
                      className={cn(
                        "rounded border px-2.5 py-1 text-xs font-medium transition-colors",
                        isOpen
                          ? "border-teal-700 bg-teal-700 text-white"
                          : selectedCount > 0
                            ? "border-teal-500 bg-teal-50 text-teal-900"
                            : "border-slate-300 bg-white text-slate-800 hover:border-teal-600 hover:text-teal-800",
                      )}
                    >
                      {panel.label}
                      {selectedCount > 0 ? ` (${selectedCount})` : null}
                    </button>
                  );
                })}
              </div>
              {openPanel ? (
                <div className="rounded border border-slate-200 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {openPanel.label}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {
                          openPanel.items.filter((t) => selected.includes(t.id))
                            .length
                        }{" "}
                        selected · tap a test to add or remove
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        onClick={() =>
                          selectAllInPanel(openPanel.items.map((t) => t.id))
                        }
                      >
                        Order all
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        disabled={
                          !openPanel.items.some((t) => selected.includes(t.id))
                        }
                        onClick={() =>
                          clearPanelSelection(openPanel.items.map((t) => t.id))
                        }
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                  <div className="grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto p-2 sm:grid-cols-3">
                    {openPanel.items.map((t) => {
                      const on = selected.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleTest(t.id)}
                          aria-pressed={on}
                          className={cn(
                            "rounded border px-2 py-2 text-left text-xs font-medium transition-colors",
                            on
                              ? "border-teal-700 bg-teal-700 text-white"
                              : "border-slate-200 bg-slate-50 text-slate-800 hover:border-teal-500 hover:bg-teal-50",
                          )}
                        >
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="rounded border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-sm text-slate-500">
                  Open a panel, then tap the tests you need.
                </p>
              )}
              {selected.length > 0 ? (
                <div className="rounded border border-teal-100 bg-teal-50/50 px-3 py-2 text-xs text-slate-700">
                  <span className="font-semibold text-teal-900">
                    {selected.length} test{selected.length === 1 ? "" : "s"} in
                    order:
                  </span>{" "}
                  {cashierLabLines.map((t) => t.name).join(", ")}
                </div>
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
                  <SuggestingInput
                    fieldKey="lab.clinicalNotes"
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
                          rememberClinicalNotes();
                          setSelected([]);
                          setOpenCategory(null);
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
                    : `Send to cashier - lab (${selected.length})`}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Send lab order goes straight to lab. Send to cashier - lab:
                patient pays first, then lab. Results come back to you.
              </p>
            </div>
          ) : null}
        </section>
      ) : (
        <p className="text-sm text-slate-500">
          Consultation finalized - new lab orders are closed.
        </p>
      )}

      <SimpleDialog
        open={cashierLabOpen}
        title="Send to cashier - lab"
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
