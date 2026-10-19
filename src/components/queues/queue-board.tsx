"use client";

import Link from "next/link";
import { formatWaitingSince } from "@/lib/format/wait-time";
import type { QueueEntry } from "@/features/queues/api";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/shared/data-table";
import { ExpandablePanel } from "@/components/shared/table-layout";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/shared/state-blocks";
import { useQueue, useUpdateQueueEntry } from "@/features/queues/hooks";
import type { QueueStation } from "@/types/encounter";
import { announcePatientCall } from "@/lib/voice/announce";
import { useMemo } from "react";
import { sortQueueByWaiting } from "@/lib/queues/sort";
import { useDateSort } from "@/lib/queues/use-date-sort";
import { DateSortToggle } from "@/components/shared/date-sort-toggle";

export function QueueBoard({
  station,
  hrefPrefix,
  title,
  resolveHref,
  expandable = true,
}: {
  station: QueueStation;
  hrefPrefix: string;
  title: string;
  resolveHref?: (entry: QueueEntry) => string | null;
  expandable?: boolean;
}) {
  const queue = useQueue(station, 8_000);
  const updateEntry = useUpdateQueueEntry();
  const { direction, setDirection } = useDateSort("latest");
  const items = useMemo(
    () => sortQueueByWaiting(queue.data ?? [], direction),
    [queue.data, direction],
  );

  if (queue.isLoading) return <LoadingBlock label={`Loading ${title}`} />;
  if (queue.isError) {
    return (
      <ErrorState
        message={`Could not load ${title.toLowerCase()}.`}
        onRetry={() => void queue.refetch()}
      />
    );
  }

  const titleNode = (
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {items.length > 0 ? (
        <span className="inline-flex items-center rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
          {items.length} waiting
        </span>
      ) : (
        <span className="text-xs text-slate-500">0 waiting</span>
      )}
    </div>
  );

  const table = (
    <>
      {items.length === 0 ? (
        <EmptyState
          title="Queue is empty"
          description="New visits will appear here."
        />
      ) : (
        <DataTable>
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Patient</DataTableHeaderCell>
              <DataTableHeaderCell>Visit</DataTableHeaderCell>
              <DataTableHeaderCell>Priority</DataTableHeaderCell>
              <DataTableHeaderCell>Waiting</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell stickyRight>Actions</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {items.map((entry) => (
              <QueueRow
                key={entry.id}
                entry={entry}
                hrefPrefix={hrefPrefix}
                resolveHref={resolveHref}
                onCall={() =>
                  updateEntry.mutate(
                    { id: entry.id, status: "IN_SERVICE" },
                    {
                      onSuccess: () => {
                        const p = entry.encounter.patient;
                        announcePatientCall(p.firstName, p.lastName, station);
                      },
                    },
                  )
                }
                calling={updateEntry.isPending}
              />
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </>
  );

  const sortControl = (
    <DateSortToggle value={direction} onChange={setDirection} />
  );

  if (!expandable) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {titleNode}
          {sortControl}
        </div>
        {table}
      </div>
    );
  }

  return (
    <ExpandablePanel title={titleNode} toolbar={sortControl}>
      {table}
    </ExpandablePanel>
  );
}

function QueueRow({
  entry,
  hrefPrefix,
  resolveHref,
  onCall,
  calling,
}: {
  entry: QueueEntry;
  hrefPrefix: string;
  resolveHref?: (entry: QueueEntry) => string | null;
  onCall: () => void;
  calling: boolean;
}) {
  const href = resolveHref
    ? resolveHref(entry)
    : `${hrefPrefix}/${entry.encounterId}`;
  const p = entry.encounter.patient;
  return (
    <DataTableRow
      className={entry.status === "WAITING" ? "bg-red-50/30" : undefined}
    >
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
      <DataTableCell>{entry.priority}</DataTableCell>
      <DataTableCell>{formatWaitingSince(entry.enteredAt)}</DataTableCell>
      <DataTableCell>{entry.status.replaceAll("_", " ")}</DataTableCell>
      <DataTableCell stickyRight>
        <div className="flex flex-nowrap justify-end gap-1">
          {entry.status === "WAITING" || entry.status === "CALLED" ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={calling}
              onClick={onCall}
            >
              Call
            </Button>
          ) : null}
          {href ? (
            <Link href={href}>
              <Button type="button" size="sm">
                Open
              </Button>
            </Link>
          ) : null}
        </div>
      </DataTableCell>
    </DataTableRow>
  );
}
