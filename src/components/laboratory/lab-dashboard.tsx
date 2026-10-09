"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/shared/data-table";
import {
  EmptyState,
  ErrorState,
  LoadingBlock,
} from "@/components/shared/state-blocks";
import { labOrderStatusBadge } from "@/components/shared/status-badge";
import { useLabOrders } from "@/features/laboratory/hooks";
import { useQueue, useUpdateQueueEntry } from "@/features/queues/hooks";
import { LabOrderStatus } from "@/types/lab";
import { QueueStation } from "@/types/encounter";
import { announceClinic, stationCallLabel } from "@/lib/voice/announce";
import { formatWaitingSince } from "@/lib/format/wait-time";
import { cn } from "@/lib/utils";
import {
  sortByCreatedAtDesc,
  sortQueueNewestFirst,
} from "@/lib/queues/sort";
import { ExpandablePanel } from "@/components/shared/table-layout";
import type { LabOrder } from "@/features/laboratory/api";

type LabTab = "new" | "results" | "send" | "done";

const OPEN = new Set<string>([
  LabOrderStatus.ORDERED,
  LabOrderStatus.RECEIVED,
  LabOrderStatus.PROCESSING,
  LabOrderStatus.RESULT_ENTERED,
]);

function RedBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function actionLabel(status: string): string {
  switch (status) {
    case LabOrderStatus.ORDERED:
      return "Open";
    case LabOrderStatus.RECEIVED:
    case LabOrderStatus.PROCESSING:
      return "Enter results";
    case LabOrderStatus.RESULT_ENTERED:
      return "Send to doctor";
    case LabOrderStatus.VERIFIED:
      return "View";
    default:
      return "Open";
  }
}

export function LabDashboard() {
  const [tab, setTab] = useState<LabTab>("new");
  const orders = useLabOrders();
  const queue = useQueue(QueueStation.LAB, 8_000);
  const updateEntry = useUpdateQueueEntry();

  const groups = useMemo(() => {
    const all = sortByCreatedAtDesc(orders.data ?? []);
    return {
      new: all.filter((o) => o.status === LabOrderStatus.ORDERED),
      results: all.filter(
        (o) =>
          o.status === LabOrderStatus.RECEIVED ||
          o.status === LabOrderStatus.PROCESSING,
      ),
      send: all.filter((o) => o.status === LabOrderStatus.RESULT_ENTERED),
      done: all
        .filter((o) => o.status === LabOrderStatus.VERIFIED)
        .slice(0, 20),
    };
  }, [orders.data]);

  const orderByEncounter = useMemo(() => {
    const map = new Map<string, LabOrder>();
    for (const o of orders.data ?? []) {
      if (!OPEN.has(o.status)) continue;
      const prev = map.get(o.encounterId);
      if (!prev || new Date(o.createdAt) > new Date(prev.createdAt)) {
        map.set(o.encounterId, o);
      }
    }
    return map;
  }, [orders.data]);

  const queueItems = sortQueueNewestFirst(queue.data ?? []);
  const newCount = groups.new.length;
  const resultsCount = groups.results.length;
  const sendCount = groups.send.length;

  if (orders.isLoading) return <LoadingBlock label="Loading laboratory" />;
  if (orders.isError) {
    return (
      <ErrorState
        message="Could not load lab orders."
        onRetry={() => void orders.refetch()}
      />
    );
  }

  const tabRows =
    tab === "new"
      ? groups.new
      : tab === "results"
        ? groups.results
        : tab === "send"
          ? groups.send
          : groups.done;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Laboratory</h1>
        <p className="text-sm text-slate-600">
          New from doctor → enter results → then send to doctor. Red badges
          update live.
        </p>
      </div>

      <nav
        className="flex flex-wrap gap-2 border-b border-slate-200 pb-2"
        aria-label="Lab queues"
      >
        <TabButton
          active={tab === "new"}
          onClick={() => setTab("new")}
          label="New from doctor"
          badge={newCount}
          emphasize={newCount > 0}
        />
        <TabButton
          active={tab === "results"}
          onClick={() => setTab("results")}
          label="Enter results"
          badge={resultsCount}
          emphasize={resultsCount > 0}
        />
        <TabButton
          active={tab === "send"}
          onClick={() => setTab("send")}
          label="Send to doctor"
          badge={sendCount}
          emphasize={sendCount > 0}
        />
        <TabButton
          active={tab === "done"}
          onClick={() => setTab("done")}
          label="Sent back"
          badge={groups.done.length}
          muted
        />
      </nav>

      {tab === "new" && queueItems.length > 0 ? (
        <ExpandablePanel
          title={
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Waiting at lab station
              </h2>
              <p className="text-xs font-normal text-slate-500">
                Call the patient, then open their order
              </p>
            </div>
          }
          toolbar={
            <span className="inline-flex items-center rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
              {queueItems.length} waiting
            </span>
          }
        >
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell>Patient</DataTableHeaderCell>
                <DataTableHeaderCell>Visit</DataTableHeaderCell>
                <DataTableHeaderCell>Waiting</DataTableHeaderCell>
                <DataTableHeaderCell> </DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {queueItems.map((entry) => {
                const p = entry.encounter.patient;
                const order = orderByEncounter.get(entry.encounterId);
                return (
                  <DataTableRow key={entry.id}>
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
                    <DataTableCell className="text-right">
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
                                    `${p.firstName} ${p.lastName}, please proceed to ${stationCallLabel("LAB")}.`,
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
                      {order ? (
                        <Link href={`/laboratory/orders/${order.id}`}>
                          <Button type="button" size="sm" className="ml-2">
                            Open
                          </Button>
                        </Link>
                      ) : null}
                    </DataTableCell>
                  </DataTableRow>
                );
              })}
            </DataTableBody>
          </DataTable>
        </ExpandablePanel>
      ) : null}

      <ExpandablePanel
        className={cn(
          tab === "send" && sendCount > 0
            ? "border-red-200 ring-1 ring-red-100"
            : undefined,
        )}
        title={
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {tab === "new"
                ? "New from doctor"
                : tab === "results"
                  ? "Enter results"
                  : tab === "send"
                    ? "Results ready — send to doctor"
                    : "Already sent to doctor"}
            </h2>
            <p className="text-xs font-normal text-slate-500">
              {tab === "new"
                ? "Open → receive sample → enter results"
                : tab === "results"
                  ? "Primary work: fill and edit every test value"
                  : tab === "send"
                    ? "Review saved results, then send patient back to doctor"
                    : "Verified returns (read-only)"}
            </p>
          </div>
        }
        toolbar={
          tabRows.length > 0 && tab !== "done" ? (
            <span className="inline-flex items-center rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
              {tabRows.length}{" "}
              {tab === "new"
                ? "new"
                : tab === "results"
                  ? "to enter"
                  : "to send"}
            </span>
          ) : undefined
        }
      >
        {tabRows.length === 0 ? (
          <EmptyState
            title={
              tab === "new"
                ? "No new orders"
                : tab === "results"
                  ? "No results to enter"
                  : tab === "send"
                    ? "Nothing waiting to send"
                    : "No sent orders yet"
            }
            description={
              tab === "new"
                ? "When a doctor orders tests, they appear here first."
                : tab === "results"
                  ? "After you receive a sample, enter values here."
                  : tab === "send"
                    ? "After you save all results, send them to the doctor here."
                    : "Verified returns show here."
            }
          />
        ) : (
          <OrdersTable rows={tabRows} highlightSend={tab === "send"} />
        )}
      </ExpandablePanel>
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

function OrdersTable({
  rows,
  highlightSend,
}: {
  rows: LabOrder[];
  highlightSend?: boolean;
}) {
  return (
    <DataTable>
      <DataTableHead>
        <tr>
          <DataTableHeaderCell>Patient</DataTableHeaderCell>
          <DataTableHeaderCell>Order</DataTableHeaderCell>
          <DataTableHeaderCell>Tests</DataTableHeaderCell>
          <DataTableHeaderCell>Priority</DataTableHeaderCell>
          <DataTableHeaderCell>Status</DataTableHeaderCell>
          <DataTableHeaderCell stickyRight>Actions</DataTableHeaderCell>
        </tr>
      </DataTableHead>
      <DataTableBody>
        {rows.map((o) => (
          <DataTableRow
            key={o.id}
            className={highlightSend ? "bg-red-50/40" : undefined}
          >
            <DataTableCell>
              <span className="font-medium">
                {o.patient.firstName} {o.patient.lastName}
              </span>
              <p className="text-xs text-slate-500">
                {o.patient.patientNumber}
              </p>
            </DataTableCell>
            <DataTableCell>
              <p className="font-medium">{o.orderNumber}</p>
              <p className="text-xs text-slate-500">
                {format(new Date(o.createdAt), "dd MMM HH:mm")}
                {o.doctor
                  ? ` · Dr. ${o.doctor.firstName} ${o.doctor.lastName}`
                  : ""}
              </p>
            </DataTableCell>
            <DataTableCell className="text-xs">
              {o.items.map((i) => i.labTest.code).join(", ")}
            </DataTableCell>
            <DataTableCell>
              <span
                className={cn(
                  "text-xs font-semibold",
                  o.priority === "EMERGENCY"
                    ? "text-red-700"
                    : o.priority === "URGENT"
                      ? "text-amber-700"
                      : "text-slate-600",
                )}
              >
                {o.priority}
              </span>
            </DataTableCell>
            <DataTableCell>{labOrderStatusBadge(o.status)}</DataTableCell>
            <DataTableCell stickyRight className="text-right">
              <Link href={`/laboratory/orders/${o.id}`}>
                <Button
                  type="button"
                  size="sm"
                  className={
                    highlightSend ? "bg-red-700 hover:bg-red-800" : undefined
                  }
                >
                  {actionLabel(o.status)}
                </Button>
              </Link>
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
