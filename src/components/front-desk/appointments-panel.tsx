"use client";

import { format, startOfDay, endOfDay } from "date-fns";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/shared/data-table";
import { EmptyState, LoadingBlock } from "@/components/shared/state-blocks";
import { PatientSearchList } from "@/components/patients/patient-search-list";
import {
  useAppointments,
  useCreateAppointment,
  useUpdateAppointmentStatus,
} from "@/features/appointments/hooks";
import { AppointmentStatus } from "@/types/appointment";
import type { Patient } from "@/types/patient";

export function AppointmentsPanel() {
  const today = useMemo(() => new Date(), []);
  const from = startOfDay(today).toISOString();
  const to = endOfDay(today).toISOString();
  const list = useAppointments({ from, to });
  const create = useCreateAppointment();
  const updateStatus = useUpdateAppointmentStatus();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");

  function schedule() {
    if (!patient || !scheduledAt) return;
    create.mutate(
      {
        patientId: patient.id,
        scheduledAt: new Date(scheduledAt).toISOString(),
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          setPatient(null);
          setScheduledAt("");
          setNotes("");
        },
      },
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">
          Schedule appointment
        </h2>
        <PatientSearchList onSelectPatient={setPatient} />
        {patient ? (
          <p className="text-sm text-slate-700">
            Patient:{" "}
            <span className="font-medium">
              {[patient.firstName, patient.lastName].filter(Boolean).join(" ")}{" "}
              ({patient.patientNumber})
            </span>
          </p>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="appt-when">Date & time</Label>
          <Input
            id="appt-when"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="appt-notes">Notes</Label>
          <Input
            id="appt-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <Button
          type="button"
          disabled={!patient || !scheduledAt || create.isPending}
          onClick={schedule}
        >
          Save appointment
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">
          Today&apos;s appointments
        </h2>
        {list.isLoading ? <LoadingBlock label="Loading appointments" /> : null}
        {list.isSuccess && list.data.length === 0 ? (
          <EmptyState title="No appointments today" />
        ) : null}
        {list.data?.length ? (
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell>Time</DataTableHeaderCell>
                <DataTableHeaderCell>Patient</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
                <DataTableHeaderCell>Actions</DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {list.data.map((a) => (
                <DataTableRow key={a.id}>
                  <DataTableCell>
                    {format(new Date(a.scheduledAt), "HH:mm")}
                  </DataTableCell>
                  <DataTableCell>
                    {a.patient.firstName} {a.patient.lastName}
                  </DataTableCell>
                  <DataTableCell>{a.status.replaceAll("_", " ")}</DataTableCell>
                  <DataTableCell>
                    {a.status === AppointmentStatus.SCHEDULED ? (
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
                    ) : null}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        ) : null}
      </div>
    </div>
  );
}
