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
import { EmptyState, ErrorState, LoadingBlock } from "@/components/shared/state-blocks";
import { useQueue, useUpdateQueueEntry } from "@/features/queues/hooks";
import type { QueueStation } from "@/types/encounter";
import { announceClinic, stationCallLabel } from "@/lib/voice/announce";

export function QueueBoard({
  station,
  hrefPrefix,
  title,
  resolveHref,
}: {
  station: QueueStation;
  hrefPrefix: string;
  title: string;
  resolveHref?: (entry: QueueEntry) => string | null;
}) {
  const queue = useQueue(station);
  const updateEntry = useUpdateQueueEntry();

  if (queue.isLoading) return <LoadingBlock label={`Loading ${title}`} />;
  if (queue.isError) {
    return (
      <ErrorState
        message={`Could not load ${title.toLowerCase()}.`}
        onRetry={() => void queue.refetch()}
      />
    );
  }

  const items = queue.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        <span className="text-xs text-slate-500">{items.length} waiting</span>
      </div>
      {items.length === 0 ? (
        <EmptyState title="Queue is empty" description="New visits will appear here." />
      ) : (
        <DataTable>
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Patient</DataTableHeaderCell>
              <DataTableHeaderCell>Visit</DataTableHeaderCell>
              <DataTableHeaderCell>Priority</DataTableHeaderCell>
              <DataTableHeaderCell>Waiting</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell> </DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {items.map((entry) => (
              <QueueRow
                key={entry.id}
                entry={entry}
                hrefPrefix={hrefPrefix}
                resolveHref={resolveHref}
                station={station}
                onStart={() =>
                  updateEntry.mutate({ id: entry.id, status: "IN_SERVICE" })
                }
                onCall={() =>
                  updateEntry.mutate(
                    { id: entry.id, status: "CALLED" },
                    {
                      onSuccess: () => {
                        const p = entry.encounter.patient;
                        announceClinic(
                          `${p.firstName} ${p.lastName}, please proceed to ${stationCallLabel(station)}.`,
                        );
                      },
                    },
                  )
                }
                starting={updateEntry.isPending}
              />
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </div>
  );
}

function QueueRow({
  entry,
  hrefPrefix,
  resolveHref,
  station,
  onStart,
  onCall,
  starting,
}: {
  entry: QueueEntry;
  hrefPrefix: string;
  resolveHref?: (entry: QueueEntry) => string | null;
  station: QueueStation;
  onStart: () => void;
  onCall: () => void;
  starting: boolean;
}) {
  const href = resolveHref
    ? resolveHref(entry)
    : `${hrefPrefix}/${entry.encounterId}`;
  const p = entry.encounter.patient;
  return (
    <DataTableRow>
      <DataTableCell>
        <span className="font-medium">
          {p.firstName} {p.lastName}
        </span>
        <p className="text-xs text-slate-500">{p.patientNumber}</p>
      </DataTableCell>
      <DataTableCell>
        <p>{entry.encounter.encounterNumber}</p>
        <p className="text-xs text-slate-500">{entry.encounter.service.name}</p>
      </DataTableCell>
      <DataTableCell>{entry.priority}</DataTableCell>
      <DataTableCell>{formatWaitingSince(entry.enteredAt)}</DataTableCell>
      <DataTableCell>{entry.status.replaceAll("_", " ")}</DataTableCell>
      <DataTableCell className="text-right">
        {entry.status === "WAITING" || entry.status === "CALLED" ? (
          <>
            {entry.status === "WAITING" ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={starting}
                onClick={onCall}
              >
                Call
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={starting}
              onClick={onStart}
              className="ml-1"
            >
              Start
            </Button>
          </>
        ) : null}
        {href ? (
          <Link href={href}>
            <Button type="button" size="sm" className="ml-2">
              Open
            </Button>
          </Link>
        ) : null}
      </DataTableCell>
    </DataTableRow>
  );
}
