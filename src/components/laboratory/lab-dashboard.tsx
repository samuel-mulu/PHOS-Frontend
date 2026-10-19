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
import { announcePatientCall } from "@/lib/voice/announce";
import { formatWaitingSince } from "@/lib/format/wait-time";
import { cn } from "@/lib/utils";
import { sortByCreatedAt } from "@/lib/queues/sort";
import { useDateSort } from "@/lib/queues/use-date-sort";
import { DateSortToggle } from "@/components/shared/date-sort-toggle";
import { ExpandablePanel } from "@/components/shared/table-layout";
import { PrintFullLabActivity } from "@/components/print/print-full-lab-activity";
import { PrintPatientLabReport } from "@/components/print/print-patient-lab-report";
import type { LabOrder } from "@/features/laboratory/api";
import type { QueueEntry } from "@/features/queues/api";
import { uniquePanelLabels } from "@/lib/lab/panels";

type LabTab = "new" | "results" | "send" | "done";

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
      return "Receive sample";
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
  const { direction, setDirection } = useDateSort("latest");
  const orders = useLabOrders();
  const queue = useQueue(QueueStation.LAB, 8_000);
  const updateEntry = useUpdateQueueEntry();

  const groups = useMemo(() => {
    const all = sortByCreatedAt(orders.data ?? [], direction);
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
  }, [orders.data, direction]);

  /** Lab station queue entry by encounter (for Call / waiting time). */
  const queueByEncounter = useMemo(() => {
    const map = new Map<string, QueueEntry>();
    for (const entry of queue.data ?? []) {
      map.set(entry.encounterId, entry);
    }
    return map;
  }, [queue.data]);

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Laboratory</h1>
          <p className="text-sm text-slate-600">
            1) Receive sample → 2) Enter results → 3) Send to doctor. Opening an
            order does not move it; only those actions do.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrintPatientLabReport />
          <PrintFullLabActivity />
        </div>
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
                ? "All new lab orders from doctors. If the patient is at the lab station, Call appears here too. Stays until you Mark sample received."
                : tab === "results"
                  ? "Sample already received — enter every test value"
                  : tab === "send"
                    ? "Results saved — send patient back to the doctor"
                    : "Already verified and returned to doctor"}
            </p>
          </div>
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            {tab === "new" || tab === "results" || tab === "send" ? (
              <DateSortToggle value={direction} onChange={setDirection} />
            ) : null}
            {tabRows.length > 0 && tab !== "done" ? (
              <span className="inline-flex items-center rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
                {tabRows.length}{" "}
                {tab === "new"
                  ? "new"
                  : tab === "results"
                    ? "to enter"
                    : "to send"}
              </span>
            ) : null}
          </div>
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
                ? "When a doctor orders tests, they appear here."
                : tab === "results"
                  ? "After Mark sample received, enter values here."
                  : tab === "send"
                    ? "After all results are saved, send them to the doctor here."
                    : "Verified returns show here."
            }
          />
        ) : (
          <OrdersTable
            rows={tabRows}
            highlightSend={tab === "send"}
            showStationActions={tab === "new"}
            queueByEncounter={queueByEncounter}
            onCall={(entry) => {
              const p = entry.encounter.patient;
              updateEntry.mutate(
                { id: entry.id, status: "IN_SERVICE" },
                {
                  onSuccess: () => {
                    announcePatientCall(p.firstName, p.lastName, "LAB");
                  },
                },
              );
            }}
            stationBusy={updateEntry.isPending}
          />
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
  showStationActions,
  queueByEncounter,
  onCall,
  stationBusy,
}: {
  rows: LabOrder[];
  highlightSend?: boolean;
  showStationActions?: boolean;
  queueByEncounter?: Map<string, QueueEntry>;
  onCall?: (entry: QueueEntry) => void;
  stationBusy?: boolean;
}) {
  return (
    <DataTable>
      <DataTableHead>
        <tr>
          <DataTableHeaderCell>Patient</DataTableHeaderCell>
          <DataTableHeaderCell>Order</DataTableHeaderCell>
          <DataTableHeaderCell>Tests</DataTableHeaderCell>
          <DataTableHeaderCell>Priority</DataTableHeaderCell>
          {showStationActions ? (
            <DataTableHeaderCell>At station</DataTableHeaderCell>
          ) : (
            <DataTableHeaderCell>Status</DataTableHeaderCell>
          )}
          <DataTableHeaderCell stickyRight>Actions</DataTableHeaderCell>
        </tr>
      </DataTableHead>
      <DataTableBody>
        {rows.map((o) => {
          const entry = queueByEncounter?.get(o.encounterId);
          return (
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
                {uniquePanelLabels(o.items.map((i) => i.labTest))}
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
              {showStationActions ? (
                <DataTableCell>
                  {entry ? (
                    <div>
                      <p className="text-xs font-medium text-teal-800">
                        At lab
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatWaitingSince(entry.enteredAt)}
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">
                      Order only
                    </span>
                  )}
                </DataTableCell>
              ) : (
                <DataTableCell>{labOrderStatusBadge(o.status)}</DataTableCell>
              )}
              <DataTableCell stickyRight className="text-right">
                <div className="flex flex-nowrap justify-end gap-1.5">
                  {showStationActions &&
                  entry &&
                  (entry.status === "WAITING" ||
                    entry.status === "CALLED") ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={stationBusy}
                      onClick={() => onCall?.(entry)}
                    >
                      Call
                    </Button>
                  ) : null}
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
                </div>
              </DataTableCell>
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}
