"use client";

import { format } from "date-fns";
import Link from "next/link";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/shared/data-table";
import { ErrorState, LoadingBlock } from "@/components/shared/state-blocks";
import { usePatientChart } from "@/features/patients/hooks";
import { PatientQrBadge } from "./patient-qr-badge";

export function PatientProfile({ patientId }: { patientId: string }) {
  const { data, isLoading, isError, refetch } = usePatientChart(patientId);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-teal-200 bg-white p-5 shadow-sm md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-teal-700">
            {p.patientNumber}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{fullName}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {p.sex}
            {p.dateOfBirth
              ? ` · DOB ${format(new Date(p.dateOfBirth), "dd MMM yyyy")}`
              : ""}
            {p.phone ? ` · ${p.phone}` : ""}
          </p>
          {p.allergies ? (
            <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Allergies: {p.allergies}
            </p>
          ) : null}
        </div>
        <PatientQrBadge patientNumber={p.patientNumber} />
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <InfoCard title="Contact">
          <InfoRow label="Email" value={p.email} />
          <InfoRow label="Address" value={p.address} />
          <InfoRow
            label="Emergency"
            value={
              p.emergencyContactName
                ? `${p.emergencyContactName}${p.emergencyContactPhone ? ` — ${p.emergencyContactPhone}` : ""}`
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
          <p className="text-sm text-slate-500">No encounters.</p>
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
                      "—"}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </ChartSection>

      <ChartSection title="Laboratory">
        {data.labOrders.length === 0 ? (
          <p className="text-sm text-slate-500">No lab orders.</p>
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
                      href={`/laboratory/${o.id}`}
                      className="text-teal-700 underline"
                    >
                      {o.orderNumber}
                    </Link>
                  </DataTableCell>
                  <DataTableCell>{o.status.replaceAll("_", " ")}</DataTableCell>
                  <DataTableCell>
                    {o.items.map((i) => i.labTest.name).join(", ")}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </ChartSection>

      <ChartSection title="Prescriptions">
        {data.prescriptions.length === 0 ? (
          <p className="text-sm text-slate-500">No prescriptions.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.prescriptions.map((rx) => (
              <li
                key={rx.id}
                className="rounded border border-slate-100 px-3 py-2"
              >
                <span className="font-medium">{rx.status}</span>
                {" · "}
                {format(new Date(rx.createdAt), "dd MMM yyyy")}
                <span className="text-slate-600">
                  {" — "}
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
          <p className="text-sm text-slate-500">No invoices.</p>
        ) : (
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell>Invoice</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
                <DataTableHeaderCell>Total</DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {data.invoices.map((inv) => (
                <DataTableRow key={inv.id}>
                  <DataTableCell>{inv.invoiceNumber}</DataTableCell>
                  <DataTableCell>{inv.status}</DataTableCell>
                  <DataTableCell>
                    ETB {(inv.totalCents / 100).toFixed(2)}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </ChartSection>

      <ChartSection title="Appointments">
        {data.appointments.length === 0 ? (
          <p className="text-sm text-slate-500">No appointments on file.</p>
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
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-800">{title}</h2>
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
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <dl className="mt-3 space-y-2 text-sm">{children}</dl>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right text-slate-900">{value ?? "—"}</dd>
    </div>
  );
}
