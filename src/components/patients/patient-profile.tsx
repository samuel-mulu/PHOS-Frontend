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
import { usePatient } from "@/features/patients/hooks";

export function PatientProfile({ patientId }: { patientId: string }) {
  const { data, isLoading, isError, refetch } = usePatient(patientId);

  if (isLoading) return <LoadingBlock label="Loading patient" />;
  if (isError || !data) {
    return (
      <ErrorState message="Patient not found." onRetry={() => void refetch()} />
    );
  }

  const fullName = [data.firstName, data.middleName, data.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-teal-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-teal-700">
          {data.patientNumber}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{fullName}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {data.sex}
          {data.dateOfBirth
            ? ` · DOB ${format(new Date(data.dateOfBirth), "dd MMM yyyy")}`
            : ""}
          {data.phone ? ` · ${data.phone}` : ""}
        </p>
        {data.allergies ? (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Allergies: {data.allergies}
          </p>
        ) : null}
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <InfoCard title="Contact">
          <InfoRow label="Email" value={data.email} />
          <InfoRow label="Address" value={data.address} />
          <InfoRow
            label="Emergency"
            value={
              data.emergencyContactName
                ? `${data.emergencyContactName}${data.emergencyContactPhone ? ` — ${data.emergencyContactPhone}` : ""}`
                : null
            }
          />
        </InfoCard>
        <InfoCard title="Identifiers">
          <InfoRow label="Government ID" value={data.governmentId} />
          <InfoRow
            label="Registered"
            value={format(new Date(data.createdAt), "dd MMM yyyy HH:mm")}
          />
        </InfoCard>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-800">
          Recent encounters
        </h2>
        {data.encounters.length === 0 ? (
          <p className="text-sm text-slate-500">No encounters yet.</p>
        ) : (
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell>Started</DataTableHeaderCell>
                <DataTableHeaderCell>Type</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {data.encounters.map((enc) => (
                <DataTableRow key={enc.id}>
                  <DataTableCell>
                    {format(new Date(enc.startedAt), "dd MMM yyyy HH:mm")}
                  </DataTableCell>
                  <DataTableCell>{enc.type.replaceAll("_", " ")}</DataTableCell>
                  <DataTableCell>{enc.status.replaceAll("_", " ")}</DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Start visits from{" "}
          <Link href="/reception" className="text-teal-700 underline">
            Reception
          </Link>{" "}
          (W4).
        </p>
      </section>
    </div>
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
