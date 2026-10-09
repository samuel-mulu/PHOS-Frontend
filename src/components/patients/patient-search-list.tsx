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
import { ExpandablePanel } from "@/components/shared/table-layout";
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
  onScheduleAppointment,
  hideRegisterLink = false,
  selectLabel = "Select",
  maximize = false,
  expandable = false,
  title = "Patients",
  headerAction,
}: {
  onSelectPatient?: (patient: import("@/types/patient").Patient) => void;
  onScheduleAppointment?: (patient: import("@/types/patient").Patient) => void;
  hideRegisterLink?: boolean;
  selectLabel?: string;
  maximize?: boolean;
  /** Show full-screen expand control for this table. */
  expandable?: boolean;
  title?: string;
  headerAction?: React.ReactNode;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 350);
  const { data: user } = useCurrentUser();
  const limit = maximize || expandable ? 30 : 20;
  const showActions = Boolean(onSelectPatient || onScheduleAppointment);

  const query = usePatientsList({
    search: debouncedSearch || undefined,
    page,
    limit,
  });

  const totalPages = query.data
    ? Math.max(1, Math.ceil(query.data.total / query.data.limit))
    : 1;

  const searchBar = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div
        className={
          maximize || expandable
            ? "relative w-full flex-1"
            : "relative max-w-md flex-1"
        }
      >
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
      <div className="flex flex-wrap items-center gap-2">
        {headerAction}
        {!hideRegisterLink && user && canRegisterPatient(user.role) ? (
          <Link href="/patients/new">
            <Button type="button">Register patient</Button>
          </Link>
        ) : null}
      </div>
    </div>
  );

  const tableBlock = (
    <>
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
          <DataTable
            maxHeightClassName={
              maximize || expandable
                ? "max-h-[min(40rem,70vh)]"
                : undefined
            }
          >
            <DataTableHead>
              <tr>
                <DataTableHeaderCell>Number</DataTableHeaderCell>
                <DataTableHeaderCell>Name</DataTableHeaderCell>
                <DataTableHeaderCell>Sex</DataTableHeaderCell>
                <DataTableHeaderCell>Phone</DataTableHeaderCell>
                <DataTableHeaderCell>DOB</DataTableHeaderCell>
                {showActions ? (
                  <DataTableHeaderCell stickyRight>Actions</DataTableHeaderCell>
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
                  {showActions ? (
                    <DataTableCell stickyRight>
                      <div className="flex flex-nowrap gap-1.5">
                        {onSelectPatient ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => onSelectPatient(p)}
                          >
                            {selectLabel}
                          </Button>
                        ) : null}
                        {onScheduleAppointment ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onScheduleAppointment(p)}
                          >
                            Add appointment
                          </Button>
                        ) : null}
                      </div>
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
    </>
  );

  if (expandable) {
    return (
      <ExpandablePanel title={title} toolbar={searchBar}>
        {tableBlock}
      </ExpandablePanel>
    );
  }

  return (
    <div className="space-y-4">
      {searchBar}
      {tableBlock}
    </div>
  );
}
