"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PatientIdentityBar } from "@/components/shared/patient-identity-bar";
import { ErrorState, LoadingBlock } from "@/components/shared/state-blocks";
import { usePrescription } from "@/features/prescriptions/hooks";
import { useDispensePrescription } from "@/features/pharmacy/hooks";
import {
  medicineAvailableQty,
  useStock,
} from "@/features/inventory/hooks";

export function PrescriptionDispense({
  prescriptionId,
}: {
  prescriptionId: string;
}) {
  const rx = usePrescription(prescriptionId);
  const stock = useStock();
  const dispense = useDispensePrescription(prescriptionId);
  const [qty, setQty] = useState<Record<string, number>>({});

  if (rx.isLoading || stock.isLoading) {
    return <LoadingBlock label="Loading prescription" />;
  }
  if (rx.isError || !rx.data?.patient) {
    return <ErrorState message="Prescription not found." />;
  }

  const p = rx.data;
  const patient = p.patient!;
  const canDispense = p.status === "ACTIVE" || p.status === "PARTIAL";

  function submit() {
    const items = p.items
      .map((item) => {
        const remaining = item.quantity - item.dispensedQuantity;
        const q = qty[item.id] ?? remaining;
        if (q <= 0) return null;
        return { prescriptionItemId: item.id, quantity: q };
      })
      .filter(Boolean) as Array<{ prescriptionItemId: string; quantity: number }>;
    if (!items.length) return;
    dispense.mutate(items);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/pharmacy" className="text-sm text-teal-700 underline">
        ← Pharmacy
      </Link>
      <PatientIdentityBar
        patient={{
          patientNumber: patient.patientNumber,
          firstName: patient.firstName,
          middleName: null,
          lastName: patient.lastName,
          sex: "UNKNOWN",
          dateOfBirth: null,
          allergies: null,
        }}
        encounterStatus={p.status}
      />
      <p className="text-sm font-medium text-slate-800">{p.prescriptionNumber}</p>
      {p.notes ? (
        <p className="rounded bg-slate-50 p-2 text-sm text-slate-700">{p.notes}</p>
      ) : null}

      <div className="space-y-3">
        {p.items.map((item) => {
          const remaining = item.quantity - item.dispensedQuantity;
          const available = medicineAvailableQty(stock.data, item.medicine.id);
          return (
            <div
              key={item.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="font-medium">
                {item.medicine.code} — {item.medicine.name}
              </p>
              <p className="text-xs text-slate-600">
                {item.dose} · {item.route} · {item.frequency} · {item.duration}
              </p>
              <p className="mt-1 text-sm">
                Prescribed: {item.quantity} · Dispensed: {item.dispensedQuantity}{" "}
                · Remaining: {remaining}
              </p>
              <p className="text-sm text-teal-800">
                Available stock (backend): {available}
              </p>
              {item.instructions ? (
                <p className="text-xs text-slate-500">{item.instructions}</p>
              ) : null}
              {canDispense && remaining > 0 ? (
                <div className="mt-2 max-w-[120px]">
                  <Label className="text-xs">Dispense qty</Label>
                  <Input
                    type="number"
                    min={1}
                    max={remaining}
                    defaultValue={remaining}
                    onChange={(e) =>
                      setQty((prev) => ({
                        ...prev,
                        [item.id]: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {canDispense ? (
        <Button type="button" disabled={dispense.isPending} onClick={submit}>
          {dispense.isPending ? "Dispensing…" : "Confirm dispense"}
        </Button>
      ) : (
        <p className="text-sm text-slate-600">Prescription is fully dispensed or closed.</p>
      )}
    </div>
  );
}
