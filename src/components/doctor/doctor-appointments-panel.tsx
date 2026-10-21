"use client";

import { format, startOfDay, endOfDay, addDays } from "date-fns";
import { useMemo, useState } from "react";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/shared/data-table";
import { EmptyState, LoadingBlock } from "@/components/shared/state-blocks";
import { useAppointments } from "@/features/appointments/hooks";
import { AppointmentStatus } from "@/types/appointment";
import { cn } from "@/lib/utils";

type ApptFilter = "today" | "upcoming" | "all";

/** Doctor view of the same appointment list as front desk (read-only). */
export function DoctorAppointmentsPanel() {
  const [filter, setFilter] = useState<ApptFilter>("today");
  const today = useMemo(() => new Date(), []);

  const range = useMemo(() => {
    if (filter === "today") {
      return {
        from: startOfDay(today).toISOString(),
        to: endOfDay(today).toISOString(),
      };
    }
    if (filter === "upcoming") {
      return {
        from: startOfDay(today).toISOString(),
        to: endOfDay(addDays(today, 30)).toISOString(),
      };
    }
    return {
      from: startOfDay(addDays(today, -14)).toISOString(),
      to: endOfDay(addDays(today, 90)).toISOString(),
    };
  }, [filter, today]);

  const list = useAppointments(range);
  const rows = list.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          Same schedule front desk sees. Book follow-ups from Orders on a visit.
          Desk starts the visit when the patient arrives.
        </p>
        <div className="flex gap-1.5 rounded-md border border-slate-200 bg-white p-1">
          {(
            [
              ["today", "Today"],
              ["upcoming", "Upcoming"],
              ["all", "All"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={cn(
                "rounded px-3 py-1.5 text-xs font-medium",
                filter === id
                  ? "bg-teal-800 text-white"
                  : "text-slate-600 hover:bg-slate-50",
              )}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {list.isLoading ? <LoadingBlock label="Loading appointments" /> : null}
      {list.isSuccess && rows.length === 0 ? (
        <EmptyState
          title={
            filter === "today"
              ? "No appointments today"
              : "No appointments in range"
          }
        />
      ) : null}
      {rows.length > 0 ? (
        <DataTable>
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>
                {filter === "today" ? "Time" : "When"}
              </DataTableHeaderCell>
              <DataTableHeaderCell>Patient</DataTableHeaderCell>
              <DataTableHeaderCell>Number</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell>Notes</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {rows.map((a) => (
              <DataTableRow key={a.id}>
                <DataTableCell>
                  {filter === "today"
                    ? format(new Date(a.scheduledAt), "HH:mm")
                    : format(new Date(a.scheduledAt), "dd MMM yyyy HH:mm")}
                </DataTableCell>
                <DataTableCell>
                  {a.patient.firstName} {a.patient.lastName}
                </DataTableCell>
                <DataTableCell className="text-teal-800">
                  {a.patient.patientNumber}
                </DataTableCell>
                <DataTableCell>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      a.status === AppointmentStatus.SCHEDULED
                        ? "text-sky-800"
                        : a.status === AppointmentStatus.CHECKED_IN
                          ? "text-emerald-800"
                          : "text-slate-600",
                    )}
                  >
                    {a.status.replaceAll("_", " ")}
                  </span>
                </DataTableCell>
                <DataTableCell className="max-w-[14rem] truncate text-slate-600">
                  {a.notes ?? "-"}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      ) : null}
    </div>
  );
}
