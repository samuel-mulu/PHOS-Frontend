"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useFacilities,
  useDepartments,
  useServices,
} from "@/features/facilities/hooks";
import { useCreateEncounter } from "@/features/encounters/hooks";
import { EncounterPriority, EncounterType } from "@/types/encounter";
import type { Patient } from "@/types/patient";

export function StartVisitForm({
  patient,
  onSuccess,
}: {
  patient: Patient;
  onSuccess?: () => void;
}) {
  const facilities = useFacilities();
  const [facilityId, setFacilityId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [type, setType] = useState<EncounterType>(EncounterType.WALK_IN);
  const [priority, setPriority] = useState<EncounterPriority>(
    EncounterPriority.ROUTINE,
  );
  const [reason, setReason] = useState("");

  const departments = useDepartments(facilityId || undefined);
  const services = useServices(departmentId || undefined);
  const create = useCreateEncounter();

  useEffect(() => {
    if (facilities.data?.length === 1 && !facilityId) {
      setFacilityId(facilities.data[0].id);
    }
  }, [facilities.data, facilityId]);

  useEffect(() => {
    setDepartmentId("");
    setServiceId("");
  }, [facilityId]);

  useEffect(() => {
    setServiceId("");
  }, [departmentId]);

  function submit() {
    if (!facilityId || !departmentId || !serviceId) return;
    create.mutate(
      {
        patientId: patient.id,
        facilityId,
        departmentId,
        serviceId,
        type,
        priority,
        reason: reason || undefined,
      },
      { onSuccess: () => onSuccess?.() },
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Starting visit for{" "}
        <span className="font-medium text-slate-900">
          {patient.firstName} {patient.lastName}
        </span>{" "}
        ({patient.patientNumber})
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Facility">
          <select
            className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
            value={facilityId}
            onChange={(e) => setFacilityId(e.target.value)}
          >
            <option value="">Select facility</option>
            {facilities.data?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Department">
          <select
            className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
            value={departmentId}
            disabled={!facilityId}
            onChange={(e) => setDepartmentId(e.target.value)}
          >
            <option value="">Select department</option>
            {departments.data?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Service">
          <select
            className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
            value={serviceId}
            disabled={!departmentId}
            onChange={(e) => setServiceId(e.target.value)}
          >
            <option value="">Select service</option>
            {services.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Visit type">
          <select
            className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as EncounterType)}
          >
            {Object.values(EncounterType).map((v) => (
              <option key={v} value={v}>
                {v.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select
            className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
            value={priority}
            onChange={(e) => setPriority(e.target.value as EncounterPriority)}
          >
            {Object.values(EncounterPriority).map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reason for visit">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>
      <Button
        type="button"
        disabled={create.isPending || !serviceId}
        onClick={submit}
      >
        {create.isPending ? "Creating…" : "Create encounter"}
      </Button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1 block text-xs">{label}</Label>
      {children}
    </div>
  );
}
