"use client";

import { useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/shared/data-table";
import { ErrorState, LoadingBlock } from "@/components/shared/state-blocks";
import { SimpleDialog } from "@/components/shared/simple-dialog";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/hooks";
import {
  useDeletePatient,
  usePatientBalance,
  usePatientChart,
} from "@/features/patients/hooks";
import { formatAge } from "@/lib/format/age";
import { formatCents } from "@/lib/format/money";
import { invoiceStateBadge } from "@/components/shared/status-badge";
import { canDeletePatient, canEditPatient } from "@/lib/permissions";
import { uniquePanelLabels } from "@/lib/lab/panels";
import { PrintPatientLabReport } from "@/components/print/print-patient-lab-report";
import { PatientEditDialog } from "./patient-edit-dialog";
import { PatientQrBadge } from "./patient-qr-badge";

export function PatientProfile({ patientId }: { patientId: string }) {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = usePatientChart(patientId);
  const { data: user } = useCurrentUser();
  const balance = usePatientBalance(patientId);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deletePatient = useDeletePatient({
    onDeleted: () => {
      setDeleteOpen(false);
      router.push("/patients");
    },
  });

  if (isLoading) return <LoadingBlock label="Loading patient chart" />;
  if (isError || !data) {
    return (
      <ErrorState message="Patient not found." onRetry={() => void refetch()} />
    );
  }

  const p = data.patient;
  const fullName = [p.firstName, p.middleName, p.lastName]
    .filter(Boolean)
    .join(" ");
  const age = formatAge(p.dateOfBirth);
  const canEdit = user ? canEditPatient(user.role) : false;
  const canDelete = user ? canDeletePatient(user.role) : false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-teal-200 bg-card p-5 shadow-sm md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-teal-700">
            {p.patientNumber}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">{fullName}</h1>
          <p className="mt-1 text-sm text-muted">
            {p.sex}
            {age ? ` · ${age}` : ""}
            {p.phone ? ` · ${p.phone}` : ""}
          </p>
          {p.allergies ? (
            <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Allergies: {p.allergies}
            </p>
          ) : null}
          {(balance.data?.outstandingCents ?? 0) > 0 ? (
            <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950">
              Owes {formatCents(balance.data!.outstandingCents)} ·{" "}
              {balance.data!.invoices.length} unpaid invoice
              {balance.data!.invoices.length === 1 ? "" : "s"} - collect at
              cashier (Debts)
            </p>
          ) : null}
          {canEdit || canDelete ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {canEdit ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditOpen(true)}
                >
                  Edit patient
                </Button>
              ) : null}
              {canDelete ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete patient
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        <PatientQrBadge patientNumber={p.patientNumber} />
      </div>

      <PatientEditDialog
        patient={p}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onUpdated={() => void refetch()}
      />

      <SimpleDialog
        open={deleteOpen}
        title="Delete this patient?"
        primaryLabel={deletePatient.isPending ? "Deleting…" : "Yes, delete"}
        secondaryLabel="Cancel"
        onSecondary={() => {
          if (!deletePatient.isPending) setDeleteOpen(false);
        }}
        onClose={() => {
          if (!deletePatient.isPending) setDeleteOpen(false);
        }}
        onPrimary={() => {
          if (deletePatient.isPending) return;
          deletePatient.mutate(patientId);
        }}
      >
        <p>
          Delete{" "}
          <span className="font-medium text-foreground">
            {fullName} ({p.patientNumber})
          </span>
          ? They will disappear from patient search. Related visits, labs, and
          bills are kept.
        </p>
      </SimpleDialog>

      <section className="grid gap-4 md:grid-cols-2">
        <InfoCard title="Contact">
          <InfoRow label="Email" value={p.email} />
          <InfoRow label="Address" value={p.address} />
          <InfoRow
            label="Emergency"
            value={
              p.emergencyContactName
                ? `${p.emergencyContactName}${p.emergencyContactPhone ? ` - ${p.emergencyContactPhone}` : ""}`
                : null
            }
          />
        </InfoCard>
        <InfoCard title="Identifiers">
          <InfoRow label="Government ID" value={p.governmentId} />
          <InfoRow
            label="Registered"
            value={format(new Date(p.createdAt), "dd MMM yyyy HH:mm")}
          />
        </InfoCard>
      </section>

      <ChartSection title="Encounters">
        {data.encounters.length === 0 ? (
          <p className="text-sm text-muted">No encounters.</p>
        ) : (
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell>Started</DataTableHeaderCell>
                <DataTableHeaderCell>Service</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
                <DataTableHeaderCell>Notes</DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {data.encounters.map((enc) => (
                <DataTableRow key={enc.id}>
                  <DataTableCell>
                    {format(new Date(enc.startedAt), "dd MMM yyyy HH:mm")}
                  </DataTableCell>
                  <DataTableCell>{enc.service?.name ?? enc.type}</DataTableCell>
                  <DataTableCell>{enc.status.replaceAll("_", " ")}</DataTableCell>
                  <DataTableCell className="max-w-xs truncate">
                    {enc.consultation?.chiefComplaint ??
                      enc.consultation?.diagnoses
                        ?.filter((d) => d.isPrimary)
                        .map((d) => d.label)
                        .join(", ") ??
                      enc.triage?.notes ??
                      "-"}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </ChartSection>

      <ChartSection
        title="Laboratory"
        action={
          <PrintPatientLabReport
            patientId={p.id}
            patientLabel={fullName}
            triggerLabel="Print lab report"
          />
        }
      >
        {data.labOrders.length === 0 ? (
          <p className="text-sm text-muted">No lab orders.</p>
        ) : (
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell>Order</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
                <DataTableHeaderCell>Tests</DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {data.labOrders.map((o) => (
                <DataTableRow key={o.id}>
                  <DataTableCell>
                    <Link
                      href={`/laboratory/orders/${o.id}`}
                      className="text-teal-700 underline"
                    >
                      {o.orderNumber}
                    </Link>
                  </DataTableCell>
                  <DataTableCell>{o.status.replaceAll("_", " ")}</DataTableCell>
                  <DataTableCell>
                    {uniquePanelLabels(o.items.map((i) => i.labTest))}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </ChartSection>

      <ChartSection title="Prescriptions">
        {data.prescriptions.length === 0 ? (
          <p className="text-sm text-muted">No prescriptions.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.prescriptions.map((rx) => (
              <li
                key={rx.id}
                className="rounded border border-border px-3 py-2"
              >
                <span className="font-medium">{rx.status}</span>
                {" · "}
                {format(new Date(rx.createdAt), "dd MMM yyyy")}
                <span className="text-muted">
                  {" - "}
                  {rx.items
                    .map((i) => `${i.medicine.name} ×${i.quantity}`)
                    .join("; ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ChartSection>

      <ChartSection title="Billing">
        {data.invoices.length === 0 ? (
          <p className="text-sm text-muted">No invoices.</p>
        ) : (
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell>Invoice</DataTableHeaderCell>
                <DataTableHeaderCell>Date</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
                <DataTableHeaderCell>Total</DataTableHeaderCell>
                <DataTableHeaderCell>Paid</DataTableHeaderCell>
                <DataTableHeaderCell>Waived</DataTableHeaderCell>
                <DataTableHeaderCell>Owed</DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {data.invoices.map((inv) => (
                <DataTableRow key={inv.id}>
                  <DataTableCell>{inv.invoiceNumber}</DataTableCell>
                  <DataTableCell className="tabular-nums">
                    {format(new Date(inv.createdAt), "dd MMM yyyy")}
                  </DataTableCell>
                  <DataTableCell>
                    {invoiceStateBadge({
                      status: inv.status,
                      totalCents: inv.totalCents,
                      paidCents: inv.paidCents ?? 0,
                      waivedCents: inv.waivedCents,
                      deferredCents: inv.deferredCents,
                    })}
                  </DataTableCell>
                  <DataTableCell className="tabular-nums">
                    {formatCents(inv.totalCents)}
                  </DataTableCell>
                  <DataTableCell className="tabular-nums">
                    {formatCents(inv.paidCents ?? 0)}
                  </DataTableCell>
                  <DataTableCell className="tabular-nums text-muted">
                    {(inv.waivedCents ?? 0) > 0
                      ? formatCents(inv.waivedCents ?? 0)
                      : "-"}
                  </DataTableCell>
                  <DataTableCell
                    className={
                      (inv.balanceCents ?? 0) > 0
                        ? "tabular-nums font-semibold text-amber-800"
                        : "tabular-nums"
                    }
                  >
                    {formatCents(inv.balanceCents ?? 0)}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </ChartSection>

      <ChartSection title="Appointments">
        {data.appointments.length === 0 ? (
          <p className="text-sm text-muted">No appointments on file.</p>
        ) : (
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell>Scheduled</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {data.appointments.map((a) => (
                <DataTableRow key={a.id}>
                  <DataTableCell>
                    {format(new Date(a.scheduledAt), "dd MMM yyyy HH:mm")}
                  </DataTableCell>
                  <DataTableCell>{a.status.replaceAll("_", " ")}</DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </ChartSection>
    </div>
  );
}

function ChartSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <dl className="mt-3 space-y-2 text-sm">{children}</dl>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-foreground">{value ?? "-"}</dd>
    </div>
  );
}
