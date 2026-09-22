"use client";

import { useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PatientIdentityBar } from "@/components/shared/patient-identity-bar";
import { ErrorState, LoadingBlock } from "@/components/shared/state-blocks";
import {
  useEnterLabResults,
  useLabOrder,
  useVerifyLabOrder,
} from "@/features/laboratory/hooks";
import { useCurrentUser } from "@/features/auth/hooks";
import { LabOrderStatus, LabResultFlag } from "@/types/lab";
import { Role } from "@/types/role";
import type { ResultValueInput } from "@/features/laboratory/api";

export function LabOrderDetail({ orderId }: { orderId: string }) {
  const { data: user } = useCurrentUser();
  const order = useLabOrder(orderId);
  const enter = useEnterLabResults(orderId);
  const verify = useVerifyLabOrder(orderId);

  const [drafts, setDrafts] = useState<
    Record<string, { value: string; flag?: string; notes?: string }>
  >({});

  if (order.isLoading) return <LoadingBlock label="Loading order" />;
  if (order.isError || !order.data) {
    return <ErrorState message="Lab order not found." />;
  }

  const o = order.data;
  const canEnter =
    user?.role === Role.LAB_TECH ||
    user?.role === Role.LAB_SUPERVISOR ||
    user?.role === Role.ADMIN ||
    user?.role === Role.CEO;
  const canEnterResults =
    canEnter &&
    (
      [
        LabOrderStatus.ORDERED,
        LabOrderStatus.PROCESSING,
        LabOrderStatus.RESULT_ENTERED,
      ] as string[]
    ).includes(o.status);
  const canVerify =
    user?.role === Role.LAB_SUPERVISOR ||
    user?.role === Role.ADMIN ||
    user?.role === Role.CEO;
  const showVerify =
    canVerify && o.status === LabOrderStatus.RESULT_ENTERED;

  function submitResults() {
    const results: ResultValueInput[] = o.items
      .map((item) => {
        const d = drafts[item.id];
        const value = d?.value?.trim() || item.result?.value;
        if (!value) return null;
        return {
          labOrderItemId: item.id,
          value,
          unit: item.labTest.unit ?? undefined,
          referenceRange: item.labTest.referenceRange ?? undefined,
          flag: (d?.flag as ResultValueInput["flag"]) || undefined,
          notes: d?.notes || undefined,
        };
      })
      .filter(Boolean) as ResultValueInput[];
    if (!results.length) return;
    enter.mutate(results, {
      onSuccess: () => order.refetch(),
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link href="/laboratory" className="text-sm text-teal-700 underline">
        ← Laboratory
      </Link>
      <PatientIdentityBar patient={o.patient} encounterStatus={o.status} />
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm text-sm">
        <p>
          <span className="font-semibold">{o.orderNumber}</span> · Priority{" "}
          {o.priority}
        </p>
        <p className="text-slate-600">
          Ordered {format(new Date(o.createdAt), "dd MMM yyyy HH:mm")}
          {o.doctor
            ? ` · Dr. ${o.doctor.firstName} ${o.doctor.lastName}`
            : ""}
        </p>
        {o.clinicalNotes ? (
          <p className="mt-2 rounded bg-slate-50 p-2 text-slate-700">
            {o.clinicalNotes}
          </p>
        ) : null}
      </div>

      <div className="space-y-4">
        {o.items.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="font-medium text-slate-900">
              {item.labTest.code} — {item.labTest.name}
            </p>
            <p className="text-xs text-slate-500">
              Unit: {item.labTest.unit ?? "—"} · Ref:{" "}
              {item.labTest.referenceRange ?? "—"}
            </p>
            {item.result && o.status === LabOrderStatus.VERIFIED ? (
              <div className="mt-2 text-sm">
                <p>
                  Result: <strong>{item.result.value}</strong>{" "}
                  {item.result.flag ? `(${item.result.flag})` : ""}
                </p>
                {item.result.notes ? <p>{item.result.notes}</p> : null}
              </div>
            ) : canEnterResults ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Value</Label>
                  <Input
                    defaultValue={item.result?.value ?? ""}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [item.id]: { ...prev[item.id], value: e.target.value },
                      }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Flag</Label>
                  <select
                    className="h-10 w-full rounded-md border px-2 text-sm"
                    defaultValue={item.result?.flag ?? ""}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [item.id]: { ...prev[item.id], flag: e.target.value },
                      }))
                    }
                  >
                    <option value="">—</option>
                    {Object.values(LabResultFlag).map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    rows={2}
                    defaultValue={item.result?.notes ?? ""}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [item.id]: { ...prev[item.id], notes: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                Results hidden until verified (doctor view).
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {canEnterResults && o.status !== LabOrderStatus.VERIFIED ? (
          <Button type="button" disabled={enter.isPending} onClick={submitResults}>
            {enter.isPending ? "Saving…" : "Save results"}
          </Button>
        ) : null}
        {showVerify ? (
          <Button
            type="button"
            variant="default"
            disabled={verify.isPending}
            onClick={() => verify.mutate(undefined, { onSuccess: () => order.refetch() })}
          >
            {verify.isPending ? "Verifying…" : "Verify order"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
