"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format } from "date-fns";
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
  WorkspacePageSkeleton,
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
import { announcePatientCall } from "@/lib/voice/announce";
import { cn } from "@/lib/utils";
import {
  sortByDateField,
  sortQueueByWaiting,
} from "@/lib/queues/sort";
import { useDateSort } from "@/lib/queues/use-date-sort";
import { DateSortToggle } from "@/components/shared/date-sort-toggle";
import { ExpandablePanel } from "@/components/shared/table-layout";
import { PrintFullLabActivity } from "@/components/print/print-full-lab-activity";
import { PrintPatientLabReport } from "@/components/print/print-patient-lab-report";
import { HmisClinicNav } from "@/components/reports/hmis-clinic-nav";
import { DoctorAppointmentsPanel } from "@/components/doctor/doctor-appointments-panel";

type DoctorTab = "waiting" | "inLab" | "lab" | "done" | "appointments";

function isLabReturn(entry: QueueEntry) {
  return entry.encounter.status === "WAITING_REVIEW";
}

function isAtLab(entry: QueueEntry) {
  return entry.encounter.status === "WAITING_LAB";
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
  const { direction, setDirection } = useDateSort("latest");
  const queue = useQueue(QueueStation.DOCTOR, 8_000);
  const updateEntry = useUpdateQueueEntry();
  const { data: user } = useCurrentUser();
  const encounters = useEncounters({ open: true });
  const completedToday = useEncounters({ completedToday: true });
  const reviewEncounters = useEncounters({ status: "WAITING_REVIEW" });
  const labOrders = useLabOrders();

  const { labReadyQueue, waitingQueue, waitingRoomCount, withDoctorCount } =
    useMemo(() => {
      const items = sortQueueByWaiting(queue.data ?? [], direction);
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
    }, [queue.data, direction]);

  /** Lab returns from queue + WAITING_REVIEW encounters (in case queue entry was missed). */
  const labReadyRows = useMemo(() => {
    const fromQueueIds = new Set(labReadyQueue.map((e) => e.encounterId));
    const extras = sortByDateField(
      (reviewEncounters.data ?? []).filter((enc) => {
        if (fromQueueIds.has(enc.id)) return false;
        if (user?.role === Role.DOCTOR) {
          return (
            enc.assignedDoctorId === user.id ||
            enc.assignedDoctor?.id === user.id ||
            !enc.assignedDoctorId
          );
        }
        return true;
      }),
      (enc) => enc.startedAt,
      direction,
    );
    return { queue: labReadyQueue, extras };
  }, [labReadyQueue, reviewEncounters.data, user, direction]);

  const labReadyCount =
    labReadyRows.queue.length + labReadyRows.extras.length;

  const mineOpen = useMemo(() => {
    const rows = encounters.data ?? [];
    return rows.filter((e) => {
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
    () => mineOpen.filter((e) => e.status === "WAITING_LAB").length,
    [mineOpen],
  );

  const waitingForLab = useMemo(
    () =>
      sortByDateField(
        mineOpen.filter((e) => e.status === "WAITING_LAB"),
        (e) => e.startedAt,
        direction,
      ),
    [mineOpen, direction],
  );

  const recentlyCompleted = useMemo(() => {
    const rows = (completedToday.data ?? []).filter((e) => {
      if (user?.role === Role.DOCTOR) {
        return (
          e.assignedDoctorId === user.id ||
          e.assignedDoctor?.id === user.id ||
          !e.assignedDoctorId
        );
      }
      return true;
    });
    return sortByDateField(
      rows,
      (e) => e.closedAt ?? e.startedAt,
      direction,
    );
  }, [completedToday.data, user, direction]);

  const completedTodayCount = recentlyCompleted.length;

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

  if (queue.isLoading) {
    return <WorkspacePageSkeleton label="Loading doctor queue" />;
  }
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-slate-900">Doctor</h1>
          <p className="text-sm text-slate-600">
            Waiting for consultation is the default. Switch tabs at the top —
            they stay with Full screen.
          </p>
          <HmisClinicNav />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PrintPatientLabReport />
          <PrintFullLabActivity />
          <DateSortToggle value={direction} onChange={setDirection} />
        </div>
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
          active={tab === "inLab"}
          onClick={() => setTab("inLab")}
        />
        <SummaryCard
          label="Completed"
          value={completedTodayCount}
          tone="green"
          active={tab === "done"}
          onClick={() => setTab("done")}
        />
      </div>

      <ExpandablePanel
        className={
          tab === "lab" && labReadyCount > 0
            ? "border-red-200 ring-1 ring-red-100"
            : undefined
        }
        title={
          <nav
            className="flex flex-wrap gap-2"
            aria-label="Doctor queues"
          >
            <TabButton
              active={tab === "waiting"}
              onClick={() => setTab("waiting")}
              label="Waiting for consultation"
              badge={waitingQueue.length}
            />
            <TabButton
              active={tab === "inLab"}
              onClick={() => setTab("inLab")}
              label="Waiting for lab"
              badge={waitingForLab.length}
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
            <TabButton
              active={tab === "appointments"}
              onClick={() => setTab("appointments")}
              label="Appointments"
              badge={0}
            />
          </nav>
        }
      >
        {tab === "appointments" ? <DoctorAppointmentsPanel /> : null}

        {tab === "waiting" ? (
          waitingQueue.length === 0 ? (
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
                  { id: entry.id, status: "IN_SERVICE" },
                  {
                    onSuccess: () => {
                      const p = entry.encounter.patient;
                      announcePatientCall(p.firstName, p.lastName, "DOCTOR");
                    },
                  },
                )
              }
            />
          )
        ) : null}

        {tab === "inLab" ? (
          waitingForLab.length === 0 ? (
            <EmptyState
              title="No one at lab"
              description="Patients you send to lab appear here until results come back."
            />
          ) : (
            <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
              {waitingForLab.map((e) => (
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
                      {e.visitNumber != null ? `Visit ${e.visitNumber} · ` : ""}
                      {e.encounterNumber} · at lab
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
          )
        ) : null}

        {tab === "lab" ? (
          labReadyCount === 0 ? (
            <EmptyState
              title="No lab returns yet"
              description="After lab verifies results, the patient appears here."
            />
          ) : (
            <LabReadyTable
              queueItems={labReadyRows.queue}
              extraEncounters={labReadyRows.extras}
              orderByEncounter={orderByEncounter}
              starting={updateEntry.isPending}
              onCall={(entry) =>
                updateEntry.mutate(
                  { id: entry.id, status: "IN_SERVICE" },
                  {
                    onSuccess: () => {
                      const p = entry.encounter.patient;
                      announcePatientCall(p.firstName, p.lastName, "DOCTOR");
                    },
                  },
                )
              }
            />
          )
        ) : null}

        {tab === "done" ? (
          completedToday.isLoading ? (
            <LoadingBlock label="Loading completed visits" />
          ) : recentlyCompleted.length === 0 ? (
            <EmptyState
              title="No completed visits today yet"
              description="After you finish a visit (and payment is cleared), it appears here with today’s visit summary."
            />
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                {format(new Date(), "EEEE, dd MMM yyyy")} ·{" "}
                {recentlyCompleted.length} completed visit
                {recentlyCompleted.length === 1 ? "" : "s"}
              </p>
              <ul className="space-y-2">
                {recentlyCompleted.map((e) => {
                  const doneAt = e.closedAt ?? e.startedAt;
                  const primaryDx =
                    e.consultation?.diagnoses?.find((d) => d.isPrimary)
                      ?.label ??
                    e.consultation?.diagnoses?.[0]?.label ??
                    null;
                  return (
                    <li
                      key={e.id}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">
                            {e.patient
                              ? `${e.patient.firstName} ${e.patient.lastName}`
                              : e.encounterNumber}
                          </p>
                          <p className="text-xs text-slate-500">
                            {e.patient?.patientNumber
                              ? `${e.patient.patientNumber} · `
                              : ""}
                            {e.visitNumber != null
                              ? `Visit ${e.visitNumber} · `
                              : ""}
                            {e.encounterNumber}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {encounterStatusBadge(e.status)}
                          <Link href={`/doctor/${e.id}`}>
                            <Button type="button" size="sm" variant="outline">
                              View visit
                            </Button>
                          </Link>
                        </div>
                      </div>
                      <dl className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                        <div>
                          <dt className="text-slate-400">Completed</dt>
                          <dd className="font-medium text-slate-800">
                            {format(new Date(doneAt), "HH:mm")}
                            <span className="font-normal text-slate-500">
                              {" "}
                              · started{" "}
                              {format(new Date(e.startedAt), "HH:mm")}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-400">Service</dt>
                          <dd className="font-medium text-slate-800">
                            {e.service?.name ?? e.department?.name ?? "—"}
                          </dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-slate-400">Chief complaint</dt>
                          <dd className="text-slate-800">
                            {e.consultation?.chiefComplaint?.trim() ||
                              e.reason?.trim() ||
                              "—"}
                          </dd>
                        </div>
                        {primaryDx || e.consultation?.assessment ? (
                          <div className="sm:col-span-2">
                            <dt className="text-slate-400">
                              {primaryDx ? "Diagnosis" : "Assessment"}
                            </dt>
                            <dd className="text-slate-800">
                              {primaryDx ||
                                e.consultation?.assessment?.trim() ||
                                "—"}
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                    </li>
                  );
                })}
              </ul>
            </div>
          )
        ) : null}
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

function LabReadyTable({
  queueItems,
  extraEncounters,
  orderByEncounter,
  starting,
  onCall,
}: {
  queueItems: QueueEntry[];
  extraEncounters: Encounter[];
  orderByEncounter: Map<string, { orderNumber: string; status: string }>;
  starting: boolean;
  onCall: (entry: QueueEntry) => void;
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
                {entry.encounter.visitNumber != null ? (
                  <p className="font-semibold text-teal-800">
                    Visit {entry.encounter.visitNumber}
                  </p>
                ) : null}
                <p className="text-xs text-slate-500">
                  {entry.encounter.encounterNumber}
                </p>
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
                {entry.status === "WAITING" || entry.status === "CALLED" ? (
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
                {enc.visitNumber != null ? (
                  <p className="font-semibold text-teal-800">
                    Visit {enc.visitNumber}
                  </p>
                ) : null}
                <p className="text-xs text-slate-500">{enc.encounterNumber}</p>
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
}: {
  items: QueueEntry[];
  starting: boolean;
  onCall: (entry: QueueEntry) => void;
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
                {entry.encounter.visitNumber != null ? (
                  <p className="font-semibold text-teal-800">
                    Visit {entry.encounter.visitNumber}
                  </p>
                ) : null}
                <p className="text-xs text-slate-500">
                  {entry.encounter.encounterNumber}
                </p>
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
