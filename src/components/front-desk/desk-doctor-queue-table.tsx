"use client";

import { useMemo, useState } from "react";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/shared/data-table";
import { ExpandablePanel } from "@/components/shared/table-layout";
import {
  EmptyState,
  ErrorState,
  LoadingBlock,
} from "@/components/shared/state-blocks";
import {
  encounterStatusBadge,
  visitLocationLabel,
} from "@/components/shared/status-badge";
import { useEncounters } from "@/features/encounters/hooks";
import { useDoctors } from "@/features/users/use-doctors";
import { formatWaitingSince } from "@/lib/format/wait-time";
import { sortByDateField } from "@/lib/queues/sort";
import { useDateSort } from "@/lib/queues/use-date-sort";
import { DateSortToggle } from "@/components/shared/date-sort-toggle";
import { Label } from "@/components/ui/label";

function doctorName(row: {
  firstName: string;
  lastName: string;
}): string {
  return `Dr. ${row.firstName} ${row.lastName}`;
}

export function DeskDoctorQueueTable() {
  const [doctorId, setDoctorId] = useState<string>("all");
  const { direction, setDirection } = useDateSort("latest");
  const encounters = useEncounters({ open: true });
  const doctors = useDoctors();

  const rows = useMemo(() => {
    const all = encounters.data ?? [];
    const filtered =
      doctorId === "all"
        ? all
        : doctorId === "unassigned"
          ? all.filter((e) => !e.assignedDoctorId)
          : all.filter(
              (e) =>
                e.assignedDoctorId === doctorId ||
                e.assignedDoctor?.id === doctorId,
            );
    return sortByDateField(filtered, (e) => e.startedAt, direction);
  }, [encounters.data, doctorId, direction]);

  return (
    <ExpandablePanel
      title={
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Doctor queue
          </h2>
          <p className="text-xs font-normal text-slate-500">
            Read-only. After you assign a visit, watch where the patient is -
            doctor, lab, cashier, ultrasound return, results.
          </p>
        </div>
      }
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <DateSortToggle value={direction} onChange={setDirection} />
          <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Filter by doctor
          </Label>
          <select
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            aria-label="Filter by doctor"
          >
            <option value="all">All doctors</option>
            <option value="unassigned">Unassigned</option>
            {(doctors.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {doctorName(d)}
              </option>
            ))}
          </select>
          {rows.length > 0 ? (
            <span className="inline-flex items-center rounded-full bg-teal-800 px-2.5 py-1 text-xs font-bold text-white">
              {rows.length}
            </span>
          ) : null}
        </div>
      }
    >
      {encounters.isLoading ? (
        <LoadingBlock label="Loading doctor queue" />
      ) : null}
      {encounters.isError ? (
        <ErrorState
          message="Could not load doctor queue."
          onRetry={() => void encounters.refetch()}
        />
      ) : null}
      {encounters.isSuccess && rows.length === 0 ? (
        <EmptyState
          title="No open visits"
          description="New, returning, and appointment visits assigned to a doctor appear here. Status updates as they move."
        />
      ) : null}
      {rows.length > 0 ? (
        <DataTable>
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Patient</DataTableHeaderCell>
              <DataTableHeaderCell>Visit</DataTableHeaderCell>
              <DataTableHeaderCell>Doctor</DataTableHeaderCell>
              <DataTableHeaderCell>Where now</DataTableHeaderCell>
              <DataTableHeaderCell>Started</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {rows.map((enc) => {
              const p = enc.patient;
              const location = visitLocationLabel(
                enc.status,
                enc.paymentReturnStation,
              );
              return (
                <DataTableRow key={enc.id}>
                  <DataTableCell>
                    <span className="font-medium">
                      {p
                        ? `${p.firstName} ${p.lastName}`
                        : "-"}
                    </span>
                    {p?.patientNumber ? (
                      <p className="text-xs text-slate-500">
                        {p.patientNumber}
                      </p>
                    ) : null}
                  </DataTableCell>
                  <DataTableCell>
                    {enc.visitNumber != null ? (
                      <p className="font-semibold text-teal-800">
                        Visit {enc.visitNumber}
                      </p>
                    ) : null}
                    <p className="text-xs text-slate-500">
                      {enc.encounterNumber}
                    </p>
                  </DataTableCell>
                  <DataTableCell>
                    {enc.assignedDoctor
                      ? doctorName(enc.assignedDoctor)
                      : "Unassigned"}
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-slate-900">
                        {location}
                      </span>
                      {encounterStatusBadge(enc.status)}
                    </div>
                  </DataTableCell>
                  <DataTableCell>
                    {formatWaitingSince(enc.startedAt)}
                  </DataTableCell>
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      ) : null}
    </ExpandablePanel>
  );
}

export function useOpenVisitCount() {
  const encounters = useEncounters({ open: true });
  return encounters.data?.length ?? 0;
}
