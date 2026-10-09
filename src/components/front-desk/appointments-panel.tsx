"use client";

import { format, startOfDay, endOfDay, addDays } from "date-fns";
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
import { ExpandablePanel } from "@/components/shared/table-layout";
import { OverlayPortal } from "@/components/shared/overlay-portal";
import { EmptyState, LoadingBlock } from "@/components/shared/state-blocks";
import { PatientIdentityBar } from "@/components/shared/patient-identity-bar";
import { StartVisitForm } from "@/components/reception/start-visit-form";
import {
  useAppointments,
  useCheckInAppointment,
  useUpdateAppointmentStatus,
} from "@/features/appointments/hooks";
import type { Appointment } from "@/features/appointments/api";
import { AppointmentStatus } from "@/types/appointment";
import { announceClinic } from "@/lib/voice/announce";
import { cn } from "@/lib/utils";

type ApptFilter = "today" | "all";

export function AppointmentsPanel() {
  const [filter, setFilter] = useState<ApptFilter>("today");
  const today = useMemo(() => new Date(), []);

  const range = useMemo(() => {
    if (filter === "today") {
      return {
        from: startOfDay(today).toISOString(),
        to: endOfDay(today).toISOString(),
      };
    }
    return {
      from: startOfDay(addDays(today, -7)).toISOString(),
      to: endOfDay(addDays(today, 90)).toISOString(),
    };
  }, [filter, today]);

  const list = useAppointments(range);
  const updateStatus = useUpdateAppointmentStatus();
  const checkIn = useCheckInAppointment();
  const [checkInAppt, setCheckInAppt] = useState<Appointment | null>(null);

  const rows = list.data ?? [];

  const filterBar = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-slate-500">
        Schedule from Reception → Find returning patient → Add appointment.
      </p>
      <div className="flex gap-1.5 rounded-md border border-slate-200 bg-white p-1">
        {(
          [
            ["today", "Today"],
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
  );

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <ExpandablePanel title="Appointments" toolbar={filterBar}>
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
                <DataTableHeaderCell stickyRight>Actions</DataTableHeaderCell>
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
                    {a.status.replaceAll("_", " ")}
                  </DataTableCell>
                  <DataTableCell className="max-w-[12rem] truncate text-slate-600">
                    {a.notes ?? "—"}
                  </DataTableCell>
                  <DataTableCell stickyRight>
                    <div className="flex flex-nowrap gap-1.5">
                      {a.status === AppointmentStatus.SCHEDULED ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setCheckInAppt(a)}
                          >
                            Start visit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateStatus.mutate({
                                id: a.id,
                                status: AppointmentStatus.NO_SHOW,
                              })
                            }
                          >
                            No show
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        ) : null}
      </ExpandablePanel>

      {checkInAppt ? (
        <OverlayPortal>
          <div className="fixed inset-0 z-[80] flex items-stretch justify-center p-2 sm:p-4">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close"
              onClick={() => setCheckInAppt(null)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="appt-visit-dialog-title"
              className="relative flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 px-5 py-3">
                <h3
                  id="appt-visit-dialog-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  Appointment — bill & start
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCheckInAppt(null)}
                >
                  Close
                </Button>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <PatientIdentityBar patient={checkInAppt.patient} />
                {checkInAppt.notes ? (
                  <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950">
                    Appointment notes: {checkInAppt.notes}
                  </p>
                ) : null}
                <StartVisitForm
                  patient={checkInAppt.patient}
                  visitKind="APPOINTMENT"
                  submitLabel="Start visit"
                  onSuccess={({ encounter, paid }) => {
                    const appt = checkInAppt;
                    checkIn.mutate(
                      { id: appt.id, encounterId: encounter.id },
                      {
                        onSuccess: () => {
                          setCheckInAppt(null);
                          announceClinic(
                            paid
                              ? `${appt.patient.firstName} ${appt.patient.lastName}, payment received. Please proceed.`
                              : `${appt.patient.firstName} ${appt.patient.lastName}, please proceed.`,
                          );
                        },
                      },
                    );
                  }}
                />
              </div>
            </div>
          </div>
        </OverlayPortal>
      ) : null}
    </div>
  );
}
