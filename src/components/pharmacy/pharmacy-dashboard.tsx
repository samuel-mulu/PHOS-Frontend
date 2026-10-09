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
import { ExpandablePanel } from "@/components/shared/table-layout";
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
        new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime(),
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

      <QueueBoard
        station={QueueStation.PHARMACY}
        hrefPrefix="/pharmacy/prescriptions"
        title="Pharmacy queue"
        resolveHref={(entry) => {
          const rx = rows.find((r) => r.encounterId === entry.encounterId);
          return rx ? `/pharmacy/prescriptions/${rx.id}` : null;
        }}
      />

      <ExpandablePanel title="Prescriptions to dispense">
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
                <DataTableHeaderCell stickyRight>Actions</DataTableHeaderCell>
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
                  <DataTableCell stickyRight>
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
      </ExpandablePanel>
    </div>
  );
}
