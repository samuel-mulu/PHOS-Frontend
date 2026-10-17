"use client";

import { useState } from "react";
import { format } from "date-fns";
import type { Patient } from "@/types/patient";
import { encounterStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { SimpleDialog } from "@/components/shared/simple-dialog";
import { formatAge } from "@/lib/format/age";

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
  >;
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

  return (
    <>
      <div className="rounded-lg border border-teal-200 bg-teal-50/60 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-lg font-semibold text-slate-900">{name}</span>
          {age ? (
            <span className="text-sm font-medium text-slate-700">{age}</span>
          ) : null}
          {visitNumber != null && visitNumber > 0 ? (
            <span className="rounded-full bg-teal-700 px-2.5 py-0.5 text-xs font-bold text-white">
              Visit {visitNumber}
            </span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto h-8 border-teal-300 bg-white text-teal-900 hover:bg-teal-50"
            onClick={() => setDetailOpen(true)}
          >
            Full detail
          </Button>
        </div>
        {patient.allergies ? (
          <p className="mt-2 text-xs font-medium text-amber-900">
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
          <dt className="text-slate-500">Name</dt>
          <dd className="font-medium text-slate-900">{name}</dd>

          <dt className="text-slate-500">Patient ID</dt>
          <dd className="font-medium text-teal-800">{patient.patientNumber}</dd>

          {visitNumber != null && visitNumber > 0 ? (
            <>
              <dt className="text-slate-500">Visit</dt>
              <dd className="font-medium text-slate-900">Visit {visitNumber}</dd>
            </>
          ) : null}

          <dt className="text-slate-500">Sex</dt>
          <dd className="text-slate-900">
            {patient.sex.replaceAll("_", " ")}
          </dd>

          <dt className="text-slate-500">Age</dt>
          <dd className="text-slate-900">{age ?? "—"}</dd>

          <dt className="text-slate-500">Date of birth</dt>
          <dd className="text-slate-900">
            {patient.dateOfBirth
              ? format(new Date(patient.dateOfBirth), "dd MMM yyyy")
              : "—"}
          </dd>

          <dt className="text-slate-500">Phone</dt>
          <dd className="text-slate-900">{patient.phone ?? "—"}</dd>

          {encounterNumber ? (
            <>
              <dt className="text-slate-500">Encounter</dt>
              <dd className="text-slate-900">{encounterNumber}</dd>
            </>
          ) : null}

          {assignedDoctor ? (
            <>
              <dt className="text-slate-500">Doctor</dt>
              <dd className="font-medium text-slate-900">
                Dr. {assignedDoctor.firstName} {assignedDoctor.lastName}
              </dd>
            </>
          ) : null}

          {encounterStatus ? (
            <>
              <dt className="text-slate-500">Status</dt>
              <dd>{encounterStatusBadge(encounterStatus)}</dd>
            </>
          ) : null}

          <dt className="text-slate-500">Allergies</dt>
          <dd
            className={
              patient.allergies
                ? "font-medium text-amber-900"
                : "text-slate-500"
            }
          >
            {patient.allergies ?? "None recorded"}
          </dd>
        </dl>
      </SimpleDialog>
    </>
  );
}
