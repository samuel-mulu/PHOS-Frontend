"use client";

import Link from "next/link";
import { format } from "date-fns";
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
import { EmptyState, ErrorState, LoadingBlock } from "@/components/shared/state-blocks";
import { QueueBoard } from "@/components/queues/queue-board";
import { useLabOrders } from "@/features/laboratory/hooks";
import { LabOrderStatus } from "@/types/lab";
import { QueueStation } from "@/types/encounter";

const FILTERS: Array<{ label: string; value?: LabOrderStatus }> = [
  { label: "All open", value: undefined },
  { label: "Ordered", value: LabOrderStatus.ORDERED },
  { label: "Processing", value: LabOrderStatus.PROCESSING },
  { label: "Ready to verify", value: LabOrderStatus.RESULT_ENTERED },
  { label: "Verified", value: LabOrderStatus.VERIFIED },
];

export function LabDashboard() {
  const [filter, setFilter] = useState<LabOrderStatus | undefined>(undefined);
  const orders = useLabOrders(filter);

  const counts = useMemo(() => {
    const all = orders.data ?? [];
    return {
      ordered: all.filter((o) => o.status === LabOrderStatus.ORDERED).length,
      processing: all.filter((o) => o.status === LabOrderStatus.PROCESSING).length,
      verify: all.filter((o) => o.status === LabOrderStatus.RESULT_ENTERED).length,
      verified: all.filter((o) => o.status === LabOrderStatus.VERIFIED).length,
    };
  }, [orders.data]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Laboratory</h1>
        <p className="text-sm text-slate-600">Orders, results, and verification.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Ordered" value={counts.ordered} />
        <Stat label="In progress" value={counts.processing} />
        <Stat label="Awaiting verify" value={counts.verify} />
        <Stat label="Verified" value={counts.verified} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <QueueBoard
          station={QueueStation.LAB}
          hrefPrefix="/laboratory/orders"
          title="Lab station queue"
          resolveHref={(entry) => {
            const order = orders.data?.find(
              (o) =>
                o.encounterId === entry.encounterId &&
                o.status !== LabOrderStatus.VERIFIED &&
                o.status !== LabOrderStatus.CANCELLED,
            );
            return order ? `/laboratory/orders/${order.id}` : null;
          }}
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.label}
              type="button"
              size="sm"
              variant={filter === f.value ? "default" : "outline"}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {orders.isLoading ? <LoadingBlock label="Loading orders" /> : null}
        {orders.isError ? (
          <ErrorState message="Could not load lab orders." onRetry={() => void orders.refetch()} />
        ) : null}

        {orders.isSuccess && orders.data.length === 0 ? (
          <EmptyState title="No lab orders" description="Orders appear when doctors request tests." />
        ) : null}

        {orders.isSuccess && orders.data.length > 0 ? (
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell>Order</DataTableHeaderCell>
                <DataTableHeaderCell>Patient</DataTableHeaderCell>
                <DataTableHeaderCell>Tests</DataTableHeaderCell>
                <DataTableHeaderCell>Priority</DataTableHeaderCell>
                <DataTableHeaderCell>Ordered</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
                <DataTableHeaderCell> </DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {orders.data.map((o) => (
                <DataTableRow key={o.id}>
                  <DataTableCell className="font-medium">{o.orderNumber}</DataTableCell>
                  <DataTableCell>
                    {o.patient.firstName} {o.patient.lastName}
                    <p className="text-xs text-slate-500">{o.patient.patientNumber}</p>
                  </DataTableCell>
                  <DataTableCell className="text-xs">
                    {o.items.map((i) => i.labTest.code).join(", ")}
                  </DataTableCell>
                  <DataTableCell>{o.priority}</DataTableCell>
                  <DataTableCell className="text-xs">
                    {format(new Date(o.createdAt), "dd MMM HH:mm")}
                  </DataTableCell>
                  <DataTableCell>{o.status.replaceAll("_", " ")}</DataTableCell>
                  <DataTableCell>
                    <Link href={`/laboratory/orders/${o.id}`}>
                      <Button type="button" size="sm">
                        Open
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
