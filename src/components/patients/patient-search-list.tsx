"use client";

import Link from "next/link";
import { useState } from "react";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { usePatientsList } from "@/features/patients/hooks";
import { canRegisterPatient } from "@/lib/permissions";
import { useCurrentUser } from "@/features/auth/hooks";

export function PatientSearchList({
  onSelectPatient,
  hideRegisterLink = false,
}: {
  onSelectPatient?: (patient: import("@/types/patient").Patient) => void;
  hideRegisterLink?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 350);
  const { data: user } = useCurrentUser();
  const limit = 20;

  const query = usePatientsList({
    search: debouncedSearch || undefined,
    page,
    limit,
  });

  const totalPages = query.data
    ? Math.max(1, Math.ceil(query.data.total / query.data.limit))
    : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search by number, name, phone, ID…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {!hideRegisterLink && user && canRegisterPatient(user.role) ? (
          <Link href="/patients/new">
            <Button type="button">Register patient</Button>
          </Link>
        ) : null}
      </div>

      {query.isLoading ? <LoadingBlock label="Searching patients" /> : null}
      {query.isError ? (
        <ErrorState
          message="Could not load patients."
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.isSuccess && query.data.items.length === 0 ? (
        <EmptyState title="No patients found" />
      ) : null}

      {query.isSuccess && query.data.items.length > 0 ? (
        <>
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell>Number</DataTableHeaderCell>
                <DataTableHeaderCell>Name</DataTableHeaderCell>
                <DataTableHeaderCell>Sex</DataTableHeaderCell>
                <DataTableHeaderCell>Phone</DataTableHeaderCell>
                <DataTableHeaderCell>DOB</DataTableHeaderCell>
                {onSelectPatient ? (
                  <DataTableHeaderCell> </DataTableHeaderCell>
                ) : null}
              </tr>
            </DataTableHead>
            <DataTableBody>
              {query.data.items.map((p) => (
                <DataTableRow key={p.id}>
                  <DataTableCell>
                    <Link
                      href={`/patients/${p.id}`}
                      className="font-medium text-teal-700 hover:underline"
                    >
                      {p.patientNumber}
                    </Link>
                  </DataTableCell>
                  <DataTableCell>
                    {[p.firstName, p.middleName, p.lastName]
                      .filter(Boolean)
                      .join(" ")}
                  </DataTableCell>
                  <DataTableCell>{p.sex}</DataTableCell>
                  <DataTableCell>{p.phone ?? "—"}</DataTableCell>
                  <DataTableCell>
                    {p.dateOfBirth
                      ? format(new Date(p.dateOfBirth), "dd MMM yyyy")
                      : "—"}
                  </DataTableCell>
                  {onSelectPatient ? (
                    <DataTableCell>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onSelectPatient(p)}
                      >
                        Select
                      </Button>
                    </DataTableCell>
                  ) : null}
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>
              Page {query.data.page} of {totalPages} ({query.data.total} total)
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
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
        </>
      ) : null}
    </div>
  );
}
