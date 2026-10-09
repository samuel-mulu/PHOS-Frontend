"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useFacilities,
  useDepartments,
  useServices,
} from "@/features/facilities/hooks";
import { useDoctors } from "@/features/users/use-doctors";
import { createEncounter, type Encounter } from "@/features/encounters/api";
import { createInvoice, issueInvoice } from "@/features/billing/api";
import { createPayment } from "@/features/payments/api";
import { useCurrentCashSession } from "@/features/cash-sessions/hooks";
import { EncounterPriority, EncounterType, QueueStation } from "@/types/encounter";
import { PaymentMethod } from "@/types/finance";
import type { Patient } from "@/types/patient";
import { formatCents } from "@/lib/format/money";
import { paymentMethodLabel } from "@/lib/format/payment-method";
import { newIdempotencyKey } from "@/lib/idempotency";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

type InitialStation = typeof QueueStation.TRIAGE | typeof QueueStation.DOCTOR;

/** How the desk opened this visit — not chosen manually. */
export type VisitKind = "NEW" | "RETURNING" | "APPOINTMENT";

const PAY_METHODS: PaymentMethod[] = [
  PaymentMethod.CASH,
  PaymentMethod.CARD,
  PaymentMethod.TELEBIRR,
];

const VISIT_KIND_META: Record<
  VisitKind,
  { label: string; type: EncounterType }
> = {
  NEW: { label: "New patient", type: EncounterType.WALK_IN },
  RETURNING: { label: "Returning patient", type: EncounterType.FOLLOW_UP },
  APPOINTMENT: { label: "Appointment", type: EncounterType.APPOINTMENT },
};

export type StartVisitResult = {
  encounter: Encounter;
  paid: boolean;
};

export function StartVisitForm({
  patient,
  visitKind,
  submitLabel = "Start visit",
  onSuccess,
}: {
  patient: Patient;
  /** Set by entry path: register → NEW, find/select → RETURNING, appointments → APPOINTMENT */
  visitKind: VisitKind;
  submitLabel?: string;
  onSuccess?: (result: StartVisitResult) => void;
}) {
  const queryClient = useQueryClient();
  const facilities = useFacilities();
  const doctors = useDoctors();
  const cashSession = useCurrentCashSession();
  const [facilityId, setFacilityId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [priority, setPriority] = useState<EncounterPriority>(
    EncounterPriority.ROUTINE,
  );
  const [reason, setReason] = useState("");
  const [assignedDoctorId, setAssignedDoctorId] = useState("");
  const [initialStation, setInitialStation] =
    useState<InitialStation>(QueueStation.DOCTOR);
  const [collectPayment, setCollectPayment] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);

  const departments = useDepartments(facilityId || undefined);
  const services = useServices(departmentId || undefined);
  const activeServices = useMemo(
    () => (services.data ?? []).filter((s) => s.active),
    [services.data],
  );
  const selectedFees = activeServices.filter((s) =>
    selectedServiceIds.includes(s.id),
  );
  const totalCents = selectedFees.reduce((sum, s) => sum + s.priceCents, 0);
  const primaryServiceId = selectedServiceIds[0] || undefined;
  const extraFees = selectedFees.slice(1);
  const kindMeta = VISIT_KIND_META[visitKind];
  const encounterType = kindMeta.type;

  useEffect(() => {
    if (facilities.data?.length === 1 && !facilityId) {
      setFacilityId(facilities.data[0].id);
    }
  }, [facilities.data, facilityId]);

  useEffect(() => {
    setDepartmentId("");
    setSelectedServiceIds([]);
  }, [facilityId]);

  useEffect(() => {
    setSelectedServiceIds([]);
  }, [departmentId]);

  useEffect(() => {
    if (departments.data?.length === 1 && !departmentId) {
      setDepartmentId(departments.data[0].id);
    }
  }, [departments.data, departmentId]);

  useEffect(() => {
    if (totalCents > 0) setCollectPayment(true);
  }, [totalCents]);

  function toggleService(id: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function submit() {
    if (!facilityId || !departmentId) return;
    if (
      collectPayment &&
      totalCents > 0 &&
      payMethod === PaymentMethod.CASH &&
      !cashSession.data?.id
    ) {
      toast.error("Open a cash session first, or pay by Card / Telebirr");
      return;
    }

    setBusy(true);
    try {
      const encounter = await createEncounter({
        patientId: patient.id,
        facilityId,
        departmentId,
        serviceId: primaryServiceId,
        type: encounterType,
        priority,
        reason: reason || undefined,
        initialStation,
        assignedDoctorId: assignedDoctorId || undefined,
      });

      let paid = false;
      if (collectPayment && totalCents > 0) {
        const draft = await createInvoice(encounter.id, {
          additionalItems: extraFees.map((s) => ({
            type: "OTHER" as const,
            description: s.name,
            quantity: 1,
            unitPriceCents: s.priceCents,
          })),
        });
        const issued = await issueInvoice(draft.id);
        await createPayment({
          idempotencyKey: newIdempotencyKey(),
          invoiceId: issued.id,
          amountCents: issued.totalCents,
          method: payMethod,
          referenceNumber: reference || undefined,
          cashSessionId:
            payMethod === PaymentMethod.CASH
              ? cashSession.data?.id
              : undefined,
        });
        paid = true;
        toast.success(
          `Paid ${formatCents(issued.totalCents)} · sent to ${
            initialStation === QueueStation.DOCTOR ? "doctor" : "triage"
          }`,
        );
      } else {
        toast.success(
          `Visit started · sent to ${
            initialStation === QueueStation.DOCTOR ? "doctor" : "triage"
          }`,
        );
      }

      void queryClient.invalidateQueries({ queryKey: ["queues"] });
      void queryClient.invalidateQueries({ queryKey: ["encounters"] });
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      void queryClient.invalidateQueries({ queryKey: ["cash-session"] });
      onSuccess?.({ encounter, paid });
    } catch (e) {
      const msg = isAxiosError(e)
        ? (e.response?.data?.details?.message as string) ??
          (e.response?.data?.message as string) ??
          e.message
        : "Could not start visit";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    Boolean(facilityId && departmentId) &&
    !busy &&
    (!collectPayment ||
      totalCents === 0 ||
      payMethod !== PaymentMethod.CASH ||
      Boolean(cashSession.data?.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-teal-800 px-3 py-1 text-xs font-semibold text-white">
          {kindMeta.label}
        </span>
      </div>

      <div>
        <Label className="mb-2 block text-xs">Send to</Label>
        <div className="grid grid-cols-2 gap-2">
          <DestButton
            active={initialStation === QueueStation.DOCTOR}
            title="Doctor"
            subtitle="Skip triage"
            onClick={() => setInitialStation(QueueStation.DOCTOR)}
          />
          <DestButton
            active={initialStation === QueueStation.TRIAGE}
            title="Triage / Nurse"
            subtitle="Then doctor"
            onClick={() => setInitialStation(QueueStation.TRIAGE)}
          />
        </div>
      </div>

      <Field label="Assign doctor">
        <select
          className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
          value={assignedDoctorId}
          onChange={(e) => setAssignedDoctorId(e.target.value)}
        >
          <option value="">Any available doctor</option>
          {doctors.data?.map((d) => (
            <option key={d.id} value={d.id}>
              Dr. {d.firstName} {d.lastName}
            </option>
          ))}
        </select>
        {doctors.isSuccess && (doctors.data?.length ?? 0) === 0 ? (
          <p className="mt-1 text-xs text-amber-800">
            No active doctor users yet. Admin → Users to create a DOCTOR account.
          </p>
        ) : null}
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Facility">
          <select
            className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm"
            value={facilityId}
            onChange={(e) => setFacilityId(e.target.value)}
          >
            <option value="">Select…</option>
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
            <option value="">Select…</option>
            {departments.data?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div>
        <Label className="mb-2 block text-xs">Clinic services (optional)</Label>
        {!departmentId ? (
          <p className="text-xs text-slate-500">Pick a department first</p>
        ) : activeServices.length === 0 ? (
          <p className="text-xs text-amber-800">
            No services yet. Admin → Facilities & services.
          </p>
        ) : (
          <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto rounded-md border border-slate-100 p-2">
            {activeServices.map((s) => {
              const on = selectedServiceIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-left text-xs font-medium transition-colors",
                    on
                      ? "border-teal-700 bg-teal-800 text-white"
                      : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
                  )}
                  onClick={() => toggleService(s.id)}
                >
                  <span className="block">{s.name}</span>
                  <span
                    className={cn(
                      "text-[11px]",
                      on ? "text-teal-100" : "text-slate-500",
                    )}
                  >
                    {s.priceCents === 0
                      ? "No fixed fee"
                      : formatCents(s.priceCents)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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
        <Field label="Reason">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-900">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={collectPayment}
            disabled={totalCents === 0}
            onChange={(e) => setCollectPayment(e.target.checked)}
          />
          Collect payment now
        </label>

        {collectPayment && totalCents > 0 ? (
          <>
            <p className="text-lg font-semibold tabular-nums text-slate-900">
              {formatCents(totalCents)}
            </p>
            <div className="flex flex-wrap gap-2">
              {PAY_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm font-medium",
                    payMethod === m
                      ? "border-teal-700 bg-teal-800 text-white"
                      : "border-slate-200 bg-white text-slate-700",
                  )}
                  onClick={() => setPayMethod(m)}
                >
                  {paymentMethodLabel(m)}
                </button>
              ))}
            </div>
            {payMethod !== PaymentMethod.CASH ? (
              <Field label="Reference (optional)">
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="POS / Telebirr ref"
                />
              </Field>
            ) : null}
            {payMethod === PaymentMethod.CASH && !cashSession.data ? (
              <p className="text-xs text-amber-800">
                No cash session.{" "}
                <Link href="/reconciliation" className="underline">
                  Open session
                </Link>{" "}
                or use Card / Telebirr.
              </p>
            ) : null}
          </>
        ) : null}
      </div>

      <Button
        type="button"
        className="w-full"
        size="lg"
        disabled={!canSubmit}
        onClick={() => void submit()}
      >
        {busy
          ? "Working…"
          : collectPayment && totalCents > 0
            ? `Pay ${formatCents(totalCents)} & send to ${
                initialStation === QueueStation.DOCTOR ? "doctor" : "triage"
              }`
            : `${submitLabel} → ${
                initialStation === QueueStation.DOCTOR ? "Doctor" : "Triage"
              }`}
      </Button>
    </div>
  );
}

function DestButton({
  active,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-md border px-3 py-3 text-left text-sm transition-colors",
        active
          ? "border-teal-700 bg-teal-800 text-white"
          : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
      )}
      onClick={onClick}
    >
      <span className="block font-semibold">{title}</span>
      <span className={cn("text-xs", active ? "text-teal-100" : "text-slate-500")}>
        {subtitle}
      </span>
    </button>
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
