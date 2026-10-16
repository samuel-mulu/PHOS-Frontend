"use client";

import { format } from "date-fns";
import type { Patient } from "@/types/patient";
import { encounterStatusBadge } from "@/components/shared/status-badge";

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
  const name = [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50/60 px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <span className="text-lg font-semibold text-slate-900">{name}</span>
        <span className="font-medium text-teal-800">{patient.patientNumber}</span>
        {visitNumber != null && visitNumber > 0 ? (
          <span className="rounded-full bg-teal-700 px-2.5 py-0.5 text-xs font-bold text-white">
            Visit {visitNumber}
          </span>
        ) : null}
        <span className="text-slate-600">{patient.sex.replaceAll("_", " ")}</span>
        {patient.dateOfBirth ? (
          <span className="text-slate-600">
            DOB {format(new Date(patient.dateOfBirth), "dd MMM yyyy")}
          </span>
        ) : null}
        {patient.phone ? (
          <span className="text-slate-600">{patient.phone}</span>
        ) : null}
        {encounterNumber ? (
          <span className="text-slate-600">Encounter {encounterNumber}</span>
        ) : null}
        {assignedDoctor ? (
          <span className="font-medium text-slate-800">
            Dr. {assignedDoctor.firstName} {assignedDoctor.lastName}
          </span>
        ) : null}
        {encounterStatus ? encounterStatusBadge(encounterStatus) : null}
      </div>
      {patient.allergies ? (
        <p className="mt-2 text-xs font-medium text-amber-900">
          Allergies: {patient.allergies}
        </p>
      ) : null}
    </div>
  );
}
