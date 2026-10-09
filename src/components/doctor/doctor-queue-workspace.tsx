"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { format, isToday, parseISO } from "date-fns";
import { formatWaitingSince } from "@/lib/format/wait-time";
import type { QueueEntry } from "@/features/queues/api";
import type { Encounter } from "@/features/encounters/api";
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
import {
  encounterStatusBadge,
  labOrderStatusBadge,
  StatusBadge,
} from "@/components/shared/status-badge";
import { useQueue, useUpdateQueueEntry } from "@/features/queues/hooks";
import { useEncounters } from "@/features/encounters/hooks";
import { useCurrentUser } from "@/features/auth/hooks";
import { useLabOrders } from "@/features/laboratory/hooks";
import type { LabOrder } from "@/features/laboratory/api";
import { QueueStation } from "@/types/encounter";
import { Role } from "@/types/role";
import { LabOrderStatus } from "@/types/lab";
import { announceClinic, stationCallLabel } from "@/lib/voice/announce";
import { cn } from "@/lib/utils";
import { sortQueueNewestFirst } from "@/lib/queues/sort";
import { ExpandablePanel } from "@/components/shared/table-layout";

type DoctorTab = "waiting" | "lab" | "done";

function isLabReturn(entry: QueueEntry) {
  return entry.encounter.status === "WAITING_REVIEW";
}

function isAtLab(entry: QueueEntry) {
  return entry.encounter.status === "WAITING_LAB";
}

const LEFT_DOCTOR = new Set([
  "WAITING_LAB",
  "WAITING_PHARMACY",
  "WAITING_PAYMENT",
  "COMPLETED",
]);

function nextStopLabel(status: string): string {
  switch (status) {
    case "WAITING_LAB":
      return "Lab";
    case "WAITING_PHARMACY":
      return "Pharmacy";
    case "WAITING_PAYMENT":
      return "Payment";
    case "COMPLETED":
      return "Done";
    default:
      return status.replaceAll("_", " ");
  }
}

function RedBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

type SummaryTone = "amber" | "blue" | "violet" | "green" | "red";

const SUMMARY_TONE: Record<
  SummaryTone,
  { bar: string; iconBg: string; icon: string }
> = {
  amber: {
    bar: "border-l-amber-400",
    iconBg: "bg-amber-100 text-amber-800",
    icon: "⏳",
  },
  blue: {
    bar: "border-l-sky-500",
    iconBg: "bg-sky-100 text-sky-800",
    icon: "🩺",
  },
  violet: {
    bar: "border-l-violet-500",
    iconBg: "bg-violet-100 text-violet-800",
    icon: "🧪",
  },
  green: {
    bar: "border-l-emerald-500",
    iconBg: "bg-emerald-100 text-emerald-800",
    icon: "✓",
  },
  red: {
    bar: "border-l-red-500",
    iconBg: "bg-red-100 text-red-800",
    icon: "📋",
  },
};

function SummaryCard({
  label,
  value,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone: SummaryTone;
  active?: boolean;
  onClick?: () => void;
}) {
  const t = SUMMARY_TONE[tone];
  const className = cn(
    "rounded-lg border border-slate-200 border-l-4 bg-white p-4 text-left shadow-sm transition-shadow",
    t.bar,
    onClick && "hover:shadow-md",
    active && "ring-1 ring-teal-700",
  );
  const body = (
    <>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-md text-sm",
            t.iconBg,
          )}
          aria-hidden
        >
          {t.icon}
        </span>
        <p className="text-xs font-medium text-slate-500">{label}</p>
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
        {value}
      </p>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}

export function DoctorQueueWorkspace() {
  const [tab, setTab] = useState<DoctorTab>("waiting");
  const queue = useQueue(QueueStation.DOCTOR, 8_000);
  const updateEntry = useUpdateQueueEntry();
  const { data: user } = useCurrentUser();
  const encounters = useEncounters();
  const reviewEncounters = useEncounters({ status: "WAITING_REVIEW" });
  const labOrders = useLabOrders();

  const { labReadyQueue, waitingQueue, waitingRoomCount, withDoctorCount } =
    useMemo(() => {
      const items = sortQueueNewestFirst(queue.data ?? []);
      const active = items.filter((e) => !isLabReturn(e) && !isAtLab(e));
      return {
        labReadyQueue: items.filter(isLabReturn),
        // Table: everyone still on doctor station (waiting + in consult)
        waitingQueue: active,
        waitingRoomCount: active.filter(
          (e) => e.status === "WAITING" || e.status === "CALLED",
        ).length,
        withDoctorCount: active.filter((e) => e.status === "IN_SERVICE")
          .length,
      };
    }, [queue.data]);

  /** Lab returns from queue + WAITING_REVIEW encounters (in case queue entry was missed). */
  const labReadyRows = useMemo(() => {
    const fromQueueIds = new Set(labReadyQueue.map((e) => e.encounterId));
    const extras = (reviewEncounters.data ?? []).filter((enc) => {
      if (fromQueueIds.has(enc.id)) return false;
      if (user?.role === Role.DOCTOR) {
        return (
          enc.assignedDoctorId === user.id ||
          enc.assignedDoctor?.id === user.id ||
          !enc.assignedDoctorId
        );
      }
      return true;
    });
    return { queue: labReadyQueue, extras };
  }, [labReadyQueue, reviewEncounters.data, user]);

  const labReadyCount =
    labReadyRows.queue.length + labReadyRows.extras.length;

  const mineToday = useMemo(() => {
    const rows = encounters.data ?? [];
    return rows.filter((e) => {
      try {
        if (!isToday(parseISO(e.startedAt))) return false;
      } catch {
        return false;
      }
      if (user?.role === Role.DOCTOR) {
        return (
          e.assignedDoctorId === user.id ||
          e.assignedDoctor?.id === user.id ||
          !e.assignedDoctorId
        );
      }
      return true;
    });
  }, [encounters.data, user]);

  const inLabCount = useMemo(
    () => mineToday.filter((e) => e.status === "WAITING_LAB").length,
    [mineToday],
  );

  const completedTodayCount = useMemo(
    () => mineToday.filter((e) => LEFT_DOCTOR.has(e.status)).length,
    [mineToday],
  );

  const recentlyCompleted = useMemo(
    () =>
      mineToday
        .filter((e) => LEFT_DOCTOR.has(e.status))
        .slice()
        .sort(
          (a, b) =>
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
        )
        .slice(0, 12),
    [mineToday],
  );

  // When a new lab return arrives, open the Lab results ready tab
  const prevLabCount = useRef(0);
  useEffect(() => {
    if (labReadyCount > prevLabCount.current) {
      setTab("lab");
    }
    prevLabCount.current = labReadyCount;
  }, [labReadyCount]);

  const orderByEncounter = useMemo(() => {
    const map = new Map<string, LabOrder>();
    for (const o of labOrders.data ?? []) {
      if (o.status === LabOrderStatus.VERIFIED) {
        const prev = map.get(o.encounterId);
        if (!prev || new Date(o.createdAt) > new Date(prev.createdAt)) {
          map.set(o.encounterId, o);
        }
      }
    }
    return map;
  }, [labOrders.data]);

  if (queue.isLoading) return <LoadingBlock label="Loading doctor queue" />;
  if (queue.isError) {
    return (
      <ErrorState
        message="Could not load doctor queue."
        onRetry={() => void queue.refetch()}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Doctor</h1>
        <p className="text-sm text-slate-600">
          Switch tabs to see waiting patients or lab results sent back to you.
          Red badges update live.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Waiting room"
          value={waitingRoomCount}
          tone="amber"
          active={tab === "waiting"}
          onClick={() => setTab("waiting")}
        />
        <SummaryCard
          label="With doctor"
          value={withDoctorCount}
          tone="blue"
          active={tab === "waiting" && withDoctorCount > 0}
          onClick={() => setTab("waiting")}
        />
        <SummaryCard
          label="In lab"
          value={inLabCount}
          tone="violet"
          active={tab === "lab"}
          onClick={() => setTab("lab")}
        />
        <SummaryCard
          label="Completed"
          value={completedTodayCount}
          tone="green"
          active={tab === "done"}
          onClick={() => setTab("done")}
        />
      </div>

      {labReadyCount > 0 ? (
        <button
          type="button"
          onClick={() => setTab("lab")}
          className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-left text-sm text-red-950"
        >
          <span>
            <strong>{labReadyCount}</strong> lab result
            {labReadyCount === 1 ? "" : "s"} ready for review
          </span>
          <span className="font-semibold text-red-800">Open →</span>
        </button>
      ) : null}

      <nav
        className="flex flex-wrap gap-2 border-b border-slate-200 pb-2"
        aria-label="Doctor queues"
      >
        <TabButton
          active={tab === "waiting"}
          onClick={() => setTab("waiting")}
          label="Waiting for consultation"
          badge={waitingQueue.length}
        />
        <TabButton
          active={tab === "lab"}
          onClick={() => setTab("lab")}
          label="Lab results ready"
          badge={labReadyCount}
          emphasize={labReadyCount > 0}
        />
        <TabButton
          active={tab === "done"}
          onClick={() => setTab("done")}
          label="Completed today"
          badge={recentlyCompleted.length}
          muted
        />
      </nav>

      {tab === "waiting" ? (
        <ExpandablePanel
          title={
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Waiting for consultation
              </h2>
              <p className="text-xs font-normal text-slate-500">
                New visits assigned to you (or unassigned)
              </p>
            </div>
          }
          toolbar={
            waitingQueue.length > 0 ? (
              <span className="inline-flex items-center rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
                {waitingQueue.length} waiting
              </span>
            ) : undefined
          }
        >
          {waitingQueue.length === 0 ? (
            <EmptyState
              title="No one waiting"
              description="When front desk assigns a patient to you, they appear here."
            />
          ) : (
            <QueueTable
              items={waitingQueue}
              starting={updateEntry.isPending}
              onCall={(entry) =>
                updateEntry.mutate(
                  { id: entry.id, status: "CALLED" },
                  {
                    onSuccess: () => {
                      const p = entry.encounter.patient;
                      announceClinic(
                        `${p.firstName} ${p.lastName}, please proceed to ${stationCallLabel("DOCTOR")}.`,
                      );
                    },
                  },
                )
              }
              onStart={(entry) =>
                updateEntry.mutate({ id: entry.id, status: "IN_SERVICE" })
              }
            />
          )}
        </ExpandablePanel>
      ) : null}

      {tab === "lab" ? (
        <ExpandablePanel
          className={
            labReadyCount > 0
              ? "border-red-200 ring-1 ring-red-100"
              : undefined
          }
          title={
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Lab results ready
              </h2>
              <p className="text-xs font-normal text-slate-500">
                Lab verified results and sent the patient back to you
              </p>
            </div>
          }
          toolbar={
            labReadyCount > 0 ? (
              <span className="inline-flex items-center rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
                {labReadyCount} ready
              </span>
            ) : undefined
          }
        >
          {labReadyCount === 0 ? (
            <EmptyState
              title="No lab returns yet"
              description="After you send a patient to lab and lab verifies results, their name appears here with status."
            />
          ) : (
            <LabReadyTable
              queueItems={labReadyRows.queue}
              extraEncounters={labReadyRows.extras}
              orderByEncounter={orderByEncounter}
              starting={updateEntry.isPending}
              onCall={(entry) =>
                updateEntry.mutate(
                  { id: entry.id, status: "CALLED" },
                  {
                    onSuccess: () => {
                      const p = entry.encounter.patient;
                      announceClinic(
                        `${p.firstName} ${p.lastName}, please proceed to ${stationCallLabel("DOCTOR")}.`,
                      );
                    },
                  },
                )
              }
              onStart={(entry) =>
                updateEntry.mutate({ id: entry.id, status: "IN_SERVICE" })
              }
            />
          )}
        </ExpandablePanel>
      ) : null}

      {tab === "done" ? (
        <ExpandablePanel
          title={
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Recently completed (today)
              </h2>
              <p className="text-xs font-normal text-slate-500">
                Read-only reopen — patient already left your active queue
              </p>
            </div>
          }
        >
          {encounters.isLoading ? (
            <LoadingBlock label="Loading completed visits" />
          ) : recentlyCompleted.length === 0 ? (
            <EmptyState
              title="No completed visits today yet"
              description="After you complete a consultation, it appears here."
            />
          ) : (
            <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
              {recentlyCompleted.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {e.patient
                        ? `${e.patient.firstName} ${e.patient.lastName}`
                        : e.encounterNumber}
                    </p>
                    <p className="text-xs text-slate-500">
                      {format(new Date(e.startedAt), "HH:mm")} ·{" "}
                      {e.encounterNumber} · now at {nextStopLabel(e.status)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {encounterStatusBadge(e.status)}
                    <Link href={`/doctor/${e.id}`}>
                      <Button type="button" size="sm" variant="outline">
                        View
                      </Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ExpandablePanel>
      ) : null}
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

function LabReadyTable({
  queueItems,
  extraEncounters,
  orderByEncounter,
  starting,
  onCall,
  onStart,
}: {
  queueItems: QueueEntry[];
  extraEncounters: Encounter[];
  orderByEncounter: Map<string, { orderNumber: string; status: string }>;
  starting: boolean;
  onCall: (entry: QueueEntry) => void;
  onStart: (entry: QueueEntry) => void;
}) {
  return (
    <DataTable>
      <DataTableHead>
        <tr>
          <DataTableHeaderCell>Patient</DataTableHeaderCell>
          <DataTableHeaderCell>Visit</DataTableHeaderCell>
          <DataTableHeaderCell>Lab order</DataTableHeaderCell>
          <DataTableHeaderCell>Status</DataTableHeaderCell>
          <DataTableHeaderCell>Waiting</DataTableHeaderCell>
          <DataTableHeaderCell stickyRight>Actions</DataTableHeaderCell>
        </tr>
      </DataTableHead>
      <DataTableBody>
        {queueItems.map((entry) => {
          const p = entry.encounter.patient;
          const order = orderByEncounter.get(entry.encounterId);
          return (
            <DataTableRow key={entry.id} className="bg-red-50/40">
              <DataTableCell>
                <span className="font-medium">
                  {p.firstName} {p.lastName}
                </span>
                <p className="text-xs text-slate-500">{p.patientNumber}</p>
                <StatusBadge label="From lab" tone="red" className="mt-1" />
              </DataTableCell>
              <DataTableCell>
                <p>{entry.encounter.encounterNumber}</p>
                <p className="text-xs text-slate-500">
                  {entry.encounter.service?.name ??
                    entry.encounter.type.replaceAll("_", " ")}
                </p>
              </DataTableCell>
              <DataTableCell>
                {order ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{order.orderNumber}</p>
                    {labOrderStatusBadge(order.status)}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">Verified</span>
                )}
              </DataTableCell>
              <DataTableCell>
                {encounterStatusBadge(entry.encounter.status)}
              </DataTableCell>
              <DataTableCell>
                {formatWaitingSince(entry.enteredAt)}
              </DataTableCell>
              <DataTableCell stickyRight className="text-right">
                {entry.status === "WAITING" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={starting}
                    onClick={() => onCall(entry)}
                  >
                    Call
                  </Button>
                ) : null}
                {(entry.status === "WAITING" || entry.status === "CALLED") && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={starting}
                    onClick={() => onStart(entry)}
                    className="ml-1"
                  >
                    Start
                  </Button>
                )}
                <Link href={`/doctor/${entry.encounterId}`}>
                  <Button
                    type="button"
                    size="sm"
                    className="ml-2 bg-red-700 hover:bg-red-800"
                  >
                    Review results
                  </Button>
                </Link>
              </DataTableCell>
            </DataTableRow>
          );
        })}
        {extraEncounters.map((enc) => {
          const order = orderByEncounter.get(enc.id);
          return (
            <DataTableRow key={`enc-${enc.id}`} className="bg-red-50/40">
              <DataTableCell>
                <span className="font-medium">
                  {enc.patient
                    ? `${enc.patient.firstName} ${enc.patient.lastName}`
                    : "Patient"}
                </span>
                {enc.patient?.patientNumber ? (
                  <p className="text-xs text-slate-500">
                    {enc.patient.patientNumber}
                  </p>
                ) : null}
                <StatusBadge label="From lab" tone="red" className="mt-1" />
              </DataTableCell>
              <DataTableCell>
                <p>{enc.encounterNumber}</p>
                <p className="text-xs text-slate-500">
                  {enc.service?.name ?? enc.type}
                </p>
              </DataTableCell>
              <DataTableCell>
                {order ? (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{order.orderNumber}</p>
                    {labOrderStatusBadge(order.status)}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">Verified</span>
                )}
              </DataTableCell>
              <DataTableCell>{encounterStatusBadge(enc.status)}</DataTableCell>
              <DataTableCell>
                {formatWaitingSince(enc.startedAt)}
              </DataTableCell>
              <DataTableCell stickyRight className="text-right">
                <Link href={`/doctor/${enc.id}`}>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-red-700 hover:bg-red-800"
                  >
                    Review results
                  </Button>
                </Link>
              </DataTableCell>
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}

function QueueTable({
  items,
  starting,
  onCall,
  onStart,
}: {
  items: QueueEntry[];
  starting: boolean;
  onCall: (entry: QueueEntry) => void;
  onStart: (entry: QueueEntry) => void;
}) {
  return (
    <DataTable>
      <DataTableHead>
        <tr>
          <DataTableHeaderCell>Patient</DataTableHeaderCell>
          <DataTableHeaderCell>Visit</DataTableHeaderCell>
          <DataTableHeaderCell>Doctor</DataTableHeaderCell>
          <DataTableHeaderCell>Priority</DataTableHeaderCell>
          <DataTableHeaderCell>Waiting</DataTableHeaderCell>
          <DataTableHeaderCell>Status</DataTableHeaderCell>
          <DataTableHeaderCell stickyRight>Actions</DataTableHeaderCell>
        </tr>
      </DataTableHead>
      <DataTableBody>
        {items.map((entry) => {
          const p = entry.encounter.patient;
          const doctor =
            entry.assignedTo ?? entry.encounter.assignedDoctor ?? null;
          return (
            <DataTableRow key={entry.id}>
              <DataTableCell>
                <span className="font-medium">
                  {p.firstName} {p.lastName}
                </span>
                <p className="text-xs text-slate-500">{p.patientNumber}</p>
              </DataTableCell>
              <DataTableCell>
                <p>{entry.encounter.encounterNumber}</p>
                <p className="text-xs text-slate-500">
                  {entry.encounter.service?.name ??
                    entry.encounter.type.replaceAll("_", " ")}
                </p>
              </DataTableCell>
              <DataTableCell>
                {doctor ? (
                  <span className="text-sm font-medium text-slate-800">
                    Dr. {doctor.firstName} {doctor.lastName}
                  </span>
                ) : (
                  <span className="text-xs text-amber-800">Unassigned</span>
                )}
              </DataTableCell>
              <DataTableCell>{entry.priority}</DataTableCell>
              <DataTableCell>
                {formatWaitingSince(entry.enteredAt)}
              </DataTableCell>
              <DataTableCell>
                {entry.status.replaceAll("_", " ")}
              </DataTableCell>
              <DataTableCell stickyRight className="text-right">
                {entry.status === "WAITING" || entry.status === "CALLED" ? (
                  <>
                    {entry.status === "WAITING" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={starting}
                        onClick={() => onCall(entry)}
                      >
                        Call
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={starting}
                      onClick={() => onStart(entry)}
                      className="ml-1"
                    >
                      Start
                    </Button>
                  </>
                ) : null}
                <Link href={`/doctor/${entry.encounterId}`}>
                  <Button type="button" size="sm" className="ml-2">
                    Open
                  </Button>
                </Link>
              </DataTableCell>
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}
