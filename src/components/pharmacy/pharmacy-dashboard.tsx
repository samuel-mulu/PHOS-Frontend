"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useMemo } from "react";
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
import { QueueBoard } from "@/components/queues/queue-board";
import { usePrescriptions } from "@/features/prescriptions/hooks";
import { QueueStation } from "@/types/encounter";

export function PharmacyDashboard() {
  const active = usePrescriptions("ACTIVE");
  const partial = usePrescriptions("PARTIAL");

  const rows = useMemo(() => {
    const a = active.data ?? [];
    const p = partial.data ?? [];
    return [...a, ...p].sort(
      (x, y) =>
        new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime(),
    );
  }, [active.data, partial.data]);

  const loading = active.isLoading || partial.isLoading;
  const error = active.isError || partial.isError;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Pharmacy</h1>
        <p className="text-sm text-slate-600">Dispense prescriptions (FEFO stock on backend).</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <QueueBoard
          station={QueueStation.PHARMACY}
          hrefPrefix="/pharmacy/prescriptions"
          title="Pharmacy queue"
          resolveHref={(entry) => {
            const rx = rows.find((r) => r.encounterId === entry.encounterId);
            return rx ? `/pharmacy/prescriptions/${rx.id}` : null;
          }}
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">
          Prescriptions to dispense
        </h2>
        {loading ? <LoadingBlock label="Loading prescriptions" /> : null}
        {error ? (
          <ErrorState message="Could not load prescriptions." />
        ) : null}
        {!loading && rows.length === 0 ? (
          <EmptyState title="No active prescriptions" />
        ) : null}
        {rows.length > 0 ? (
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell>Rx #</DataTableHeaderCell>
                <DataTableHeaderCell>Patient</DataTableHeaderCell>
                <DataTableHeaderCell>Doctor</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
                <DataTableHeaderCell>Created</DataTableHeaderCell>
                <DataTableHeaderCell> </DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {rows.map((rx) => (
                <DataTableRow key={rx.id}>
                  <DataTableCell>{rx.prescriptionNumber}</DataTableCell>
                  <DataTableCell>
                    {rx.patient
                      ? `${rx.patient.firstName} ${rx.patient.lastName}`
                      : "—"}
                  </DataTableCell>
                  <DataTableCell>
                    {rx.doctor
                      ? `Dr. ${rx.doctor.firstName} ${rx.doctor.lastName}`
                      : "—"}
                  </DataTableCell>
                  <DataTableCell>{rx.status}</DataTableCell>
                  <DataTableCell className="text-xs">
                    {format(new Date(rx.createdAt), "dd MMM HH:mm")}
                  </DataTableCell>
                  <DataTableCell>
                    <Link href={`/pharmacy/prescriptions/${rx.id}`}>
                      <Button type="button" size="sm">
                        Dispense
                      </Button>
                    </Link>
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
