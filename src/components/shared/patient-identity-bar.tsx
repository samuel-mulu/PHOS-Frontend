"use client";

import { useState } from "react";
import { format } from "date-fns";
import type { Patient } from "@/types/patient";
import { encounterStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { SimpleDialog } from "@/components/shared/simple-dialog";
import { formatAge } from "@/lib/format/age";
import { formatCents } from "@/lib/format/money";
import { usePatientBalance } from "@/features/patients/hooks";

export function PatientIdentityBar({
  patient,
  encounterNumber,
  visitNumber,
  encounterStatus,
  assignedDoctor,
}: {
  patient: Pick<
    Patient,
    | "patientNumber"
    | "firstName"
    | "middleName"
    | "lastName"
    | "sex"
    | "dateOfBirth"
    | "allergies"
    | "phone"
  > & { id?: string };
  encounterNumber?: string;
  visitNumber?: number;
  encounterStatus?: string;
  assignedDoctor?: {
    firstName: string;
    lastName: string;
  } | null;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const name = [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(" ");
  const age = formatAge(patient.dateOfBirth);
  // Debt from pay later / part payment - visible to every station.
  const balance = usePatientBalance(patient.id);
  const owedCents = balance.data?.outstandingCents ?? 0;

  return (
    <>
      <div className="rounded-lg border border-border bg-muted-bg/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-lg font-semibold text-foreground">{name}</span>
          {age ? (
            <span className="text-sm font-medium text-muted">{age}</span>
          ) : null}
          {visitNumber != null && visitNumber > 0 ? (
            <span className="rounded-full bg-teal-800 px-2.5 py-0.5 text-xs font-bold text-white dark:bg-teal-900 dark:text-teal-100">
              Visit {visitNumber}
            </span>
          ) : null}
          {owedCents > 0 ? (
            <span
              className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-950 ring-1 ring-amber-300"
              title={`${balance.data?.invoices.length ?? 0} unpaid invoice(s) - collect at cashier`}
            >
              Owes {formatCents(owedCents)}
            </span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto h-8"
            onClick={() => setDetailOpen(true)}
          >
            Full detail
          </Button>
        </div>
        {patient.allergies ? (
          <p className="mt-2 text-xs font-medium text-amber-900 dark:text-amber-200">
            Allergies: {patient.allergies}
          </p>
        ) : null}
      </div>

      <SimpleDialog
        open={detailOpen}
        title="Patient details"
        primaryLabel="Close"
        onPrimary={() => setDetailOpen(false)}
        onClose={() => setDetailOpen(false)}
      >
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted">Name</dt>
          <dd className="font-medium text-foreground">{name}</dd>

          <dt className="text-muted">Patient ID</dt>
          <dd className="font-medium text-foreground">{patient.patientNumber}</dd>

          {visitNumber != null && visitNumber > 0 ? (
            <>
              <dt className="text-muted">Visit</dt>
              <dd className="font-medium text-foreground">Visit {visitNumber}</dd>
            </>
          ) : null}

          <dt className="text-muted">Sex</dt>
          <dd className="text-foreground">
            {patient.sex.replaceAll("_", " ")}
          </dd>

          <dt className="text-muted">Age</dt>
          <dd className="text-foreground">{age ?? "-"}</dd>

          <dt className="text-muted">Date of birth</dt>
          <dd className="text-foreground">
            {patient.dateOfBirth
              ? format(new Date(patient.dateOfBirth), "dd MMM yyyy")
              : "-"}
          </dd>

          <dt className="text-muted">Phone</dt>
          <dd className="text-foreground">{patient.phone ?? "-"}</dd>

          {encounterNumber ? (
            <>
              <dt className="text-muted">Encounter</dt>
              <dd className="text-foreground">{encounterNumber}</dd>
            </>
          ) : null}

          {assignedDoctor ? (
            <>
              <dt className="text-muted">Doctor</dt>
              <dd className="font-medium text-foreground">
                Dr. {assignedDoctor.firstName} {assignedDoctor.lastName}
              </dd>
            </>
          ) : null}

          {encounterStatus ? (
            <>
              <dt className="text-muted">Status</dt>
              <dd>{encounterStatusBadge(encounterStatus)}</dd>
            </>
          ) : null}

          <dt className="text-muted">Allergies</dt>
          <dd
            className={
              patient.allergies
                ? "font-medium text-amber-900"
                : "text-muted"
            }
          >
            {patient.allergies ?? "None recorded"}
          </dd>
        </dl>
      </SimpleDialog>
    </>
  );
}
