"use client";

import { useState } from "react";
import Link from "next/link";
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
import {
  EmptyState,
  ErrorState,
  LoadingBlock,
} from "@/components/shared/state-blocks";
import { QueryStaleBanner } from "@/components/shared/query-stale-banner";
import { SimpleDialog } from "@/components/shared/simple-dialog";
import { ExpandablePanel } from "@/components/shared/table-layout";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import {
  useDeletePatient,
  usePatientsList,
} from "@/features/patients/hooks";
import { formatAge } from "@/lib/format/age";
import type { Patient } from "@/types/patient";

export function AdminPatientsPanel() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<Patient | null>(null);
  const debounced = useDebouncedValue(search, 300);
  const query = usePatientsList({
    search: debounced || undefined,
    page,
    limit: 20,
  });
  const deletePatient = useDeletePatient({
    onDeleted: () => setPendingDelete(null),
  });

  const totalPages = query.data
    ? Math.max(1, Math.ceil(query.data.total / query.data.limit))
    : 1;

  const searchBar = (
    <div className="max-w-md">
      <Label htmlFor="patient-admin-search">Search patients</Label>
      <Input
        id="patient-admin-search"
        className="mt-1"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        placeholder="Name, phone, or patient number"
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Soft-delete hides a patient from search and registration. Visits, lab
        results, and invoices stay in the database.
      </p>
      <QueryStaleBanner query={query} />
      {searchBar}

      {query.isLoading ? (
        <LoadingBlock label="Loading patients" />
      ) : query.isError ? (
        <ErrorState
          message="Could not load patients."
          onRetry={() => void query.refetch()}
        />
      ) : !query.data?.items.length ? (
        <EmptyState title="No patients found" />
      ) : (
        <ExpandablePanel title="Patients">
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell>Number</DataTableHeaderCell>
                <DataTableHeaderCell>Name</DataTableHeaderCell>
                <DataTableHeaderCell>Sex / age</DataTableHeaderCell>
                <DataTableHeaderCell>Phone</DataTableHeaderCell>
                <DataTableHeaderCell className="text-right">
                  Actions
                </DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {query.data.items.map((patient) => {
                const name = [patient.firstName, patient.middleName, patient.lastName]
                  .filter(Boolean)
                  .join(" ");
                const age = formatAge(patient.dateOfBirth);
                return (
                  <DataTableRow key={patient.id}>
                    <DataTableCell className="font-medium text-teal-800">
                      {patient.patientNumber}
                    </DataTableCell>
                    <DataTableCell>{name}</DataTableCell>
                    <DataTableCell>
                      {patient.sex}
                      {age ? ` · ${age}` : ""}
                    </DataTableCell>
                    <DataTableCell>{patient.phone ?? "—"}</DataTableCell>
                    <DataTableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          href={`/patients/${patient.id}`}
                          className="inline-flex h-8 items-center rounded-md border border-border-strong bg-card px-3 text-xs font-medium text-foreground hover:bg-slate-50"
                        >
                          Open
                        </Link>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => setPendingDelete(patient)}
                        >
                          Delete
                        </Button>
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                );
              })}
            </DataTableBody>
          </DataTable>
          <div className="mt-3 flex items-center justify-between text-sm text-muted">
            <span>
              Page {page} of {totalPages} · {query.data.total} patients
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </ExpandablePanel>
      )}

      <SimpleDialog
        open={Boolean(pendingDelete)}
        title="Delete this patient?"
        primaryLabel={deletePatient.isPending ? "Deleting…" : "Yes, delete"}
        secondaryLabel="Cancel"
        onSecondary={() => {
          if (!deletePatient.isPending) setPendingDelete(null);
        }}
        onClose={() => {
          if (!deletePatient.isPending) setPendingDelete(null);
        }}
        onPrimary={() => {
          if (!pendingDelete || deletePatient.isPending) return;
          deletePatient.mutate(pendingDelete.id);
        }}
      >
        {pendingDelete ? (
          <p>
            Delete{" "}
            <span className="font-medium text-foreground">
              {[pendingDelete.firstName, pendingDelete.lastName]
                .filter(Boolean)
                .join(" ")}{" "}
              ({pendingDelete.patientNumber})
            </span>
            ? They will disappear from patient search. Related visits, labs, and
            bills are kept.
          </p>
        ) : null}
      </SimpleDialog>
    </div>
  );
}
