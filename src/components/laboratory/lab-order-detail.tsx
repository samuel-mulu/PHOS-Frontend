"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PatientIdentityBar } from "@/components/shared/patient-identity-bar";
import { PaymentRequestPanel } from "@/components/shared/payment-request-panel";
import { ErrorState, LoadingBlock } from "@/components/shared/state-blocks";
import { labOrderStatusBadge } from "@/components/shared/status-badge";
import {
  useEnterLabResults,
  useLabOrder,
  useReceiveLabOrder,
  useVerifyLabOrder,
} from "@/features/laboratory/hooks";
import { useCurrentUser } from "@/features/auth/hooks";
import { LabOrderStatus, LabResultFlag } from "@/types/lab";
import { Role } from "@/types/role";
import type { ResultValueInput } from "@/features/laboratory/api";
import { PrintLabReport } from "@/components/print/print-lab-report";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Draft = { value: string; flag: string; notes: string };

function stepIndex(status: string): number {
  switch (status) {
    case LabOrderStatus.ORDERED:
      return 0;
    case LabOrderStatus.RECEIVED:
    case LabOrderStatus.PROCESSING:
      return 1;
    case LabOrderStatus.RESULT_ENTERED:
      return 2;
    case LabOrderStatus.VERIFIED:
      return 3;
    default:
      return 0;
  }
}

export function LabOrderDetail({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const order = useLabOrder(orderId);
  const receive = useReceiveLabOrder(orderId);
  const enter = useEnterLabResults(orderId);
  const verify = useVerifyLabOrder(orderId);

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [seededFor, setSeededFor] = useState<string | null>(null);
  /** When on step 3, false = send view on top; true = full step 2 editor */
  const [resultsEditMode, setResultsEditMode] = useState(false);
  const resultsSectionRef = useRef<HTMLElement>(null);

  const o = order.data;

  useEffect(() => {
    if (!o) return;
    const key = `${o.id}:${o.status}:${o.items.map((i) => `${i.result?.value ?? ""}:${i.result?.flag ?? ""}:${i.result?.notes ?? ""}`).join("|")}`;
    if (seededFor === key) return;
    const next: Record<string, Draft> = {};
    for (const item of o.items) {
      next[item.id] = {
        value: item.result?.value ?? "",
        flag: item.result?.flag ?? "",
        notes: item.result?.notes ?? "",
      };
    }
    setDrafts(next);
    setSeededFor(key);
  }, [o, seededFor]);

  useEffect(() => {
    if (o?.status !== LabOrderStatus.RESULT_ENTERED) {
      setResultsEditMode(false);
    }
  }, [o?.status, o?.id]);

  const filledCount = useMemo(() => {
    if (!o) return 0;
    return o.items.filter((item) => Boolean(drafts[item.id]?.value?.trim()))
      .length;
  }, [o, drafts]);

  const canWork =
    user?.role === Role.LAB_TECH ||
    user?.role === Role.LAB_SUPERVISOR ||
    user?.role === Role.ADMIN ||
    user?.role === Role.CEO;
  const canVerify =
    user?.role === Role.LAB_SUPERVISOR ||
    user?.role === Role.ADMIN ||
    user?.role === Role.CEO;

  if (order.isLoading) return <LoadingBlock label="Loading order" />;
  if (order.isError || !o) {
    return <ErrorState message="Lab order not found." />;
  }

  const active = stepIndex(o.status);
  const canReceive = canWork && o.status === LabOrderStatus.ORDERED;
  const canEditResults =
    canWork &&
    (
      [
        LabOrderStatus.RECEIVED,
        LabOrderStatus.PROCESSING,
        LabOrderStatus.RESULT_ENTERED,
      ] as string[]
    ).includes(o.status);
  const resultsReady = o.status === LabOrderStatus.RESULT_ENTERED;
  const showSend = canVerify && resultsReady;
  const isDone = o.status === LabOrderStatus.VERIFIED;
  const allFilled = filledCount === o.items.length;

  function updateDraft(itemId: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({
      ...prev,
      [itemId]: {
        value: prev[itemId]?.value ?? "",
        flag: prev[itemId]?.flag ?? "",
        notes: prev[itemId]?.notes ?? "",
        ...patch,
      },
    }));
  }

  function buildResults(): ResultValueInput[] | null {
    if (!o) return null;
    const results: ResultValueInput[] = o.items
      .map((item) => {
        const d = drafts[item.id];
        const value = d?.value?.trim();
        if (!value) return null;
        return {
          labOrderItemId: item.id,
          value,
          unit: item.labTest.unit ?? undefined,
          referenceRange: item.labTest.referenceRange ?? undefined,
          flag: (d?.flag as ResultValueInput["flag"]) || undefined,
          notes: d?.notes?.trim() || undefined,
        };
      })
      .filter(Boolean) as ResultValueInput[];

    if (results.length < o.items.length) {
      toast.error("Enter a value for every test the doctor ordered");
      return null;
    }
    return results;
  }

  function saveResults() {
    const results = buildResults();
    if (!results) return;
    const returningToSend = showSend && resultsEditMode;
    enter.mutate(results, {
      onSuccess: () => {
        setSeededFor(null);
        void order.refetch();
        if (returningToSend) {
          setResultsEditMode(false);
          toast.success("Results updated — review and send to doctor");
        } else {
          toast.success("Results saved — review them, then send to doctor");
        }
      },
    });
  }

  function openResultsEditor() {
    setResultsEditMode(true);
    requestAnimationFrame(() => {
      resultsSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function sendToDoctor() {
    verify.mutate(undefined, {
      onSuccess: () => {
        toast.success("Sent to doctor — Lab results ready");
        router.push("/laboratory");
      },
    });
  }

  const steps = [
    { label: "1. Receive sample", hint: "Confirm specimen arrived" },
    { label: "2. Enter results", hint: "See and edit all test values" },
    { label: "3. Send to doctor", hint: "After results are saved" },
  ];

  const sendViewOnTop = showSend && !resultsEditMode;
  const showResultsSection = !sendViewOnTop;

  const step3SendSection =
    showSend || isDone ? (
      <section
        className={cn(
          "rounded-lg border bg-white p-4 shadow-sm",
          showSend ? "border-red-200 ring-1 ring-red-100" : "border-slate-200",
        )}
      >
        <h2 className="text-sm font-semibold text-slate-900">
          {isDone ? "Sent to doctor" : "Step 3 — Send to doctor"}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {isDone
            ? "Patient is on the doctor’s Lab results ready queue."
            : "Results are saved. Review the summary below, edit if needed, then send to the doctor."}
        </p>

        {showSend ? (
          <ul className="mt-3 divide-y divide-slate-100 rounded-md border border-slate-200 bg-slate-50">
            {o.items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="font-medium text-slate-800">
                  {item.labTest.code}
                </span>
                <span className="text-slate-900">
                  {drafts[item.id]?.value || item.result?.value || "—"}
                  {(item.labTest.unit || item.result?.unit) && (
                    <span className="ml-1 text-xs text-slate-500">
                      {item.labTest.unit ?? item.result?.unit}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {showSend ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={openResultsEditor}>
              Edit results (Step 2)
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-red-300 text-red-900 hover:bg-red-50"
              disabled={verify.isPending}
              onClick={sendToDoctor}
            >
              {verify.isPending ? "Sending…" : "Send to doctor"}
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => router.push("/laboratory")}
          >
            Laboratory queue
          </Button>
        )}

      </section>
    ) : null;

  const labPaymentSection =
    canWork && !isDone && o.encounterId && (canEditResults || resultsReady) ? (
      <PaymentRequestPanel
        encounterId={o.encounterId}
        returnStation="LAB"
        title="Charge & send to cashier"
      />
    ) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PatientIdentityBar patient={o.patient} encounterStatus={o.status} />
        {isDone ? <PrintLabReport order={o} /> : null}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{o.orderNumber}</span>
          {labOrderStatusBadge(o.status)}
          <span className="text-slate-600">· {o.priority}</span>
        </div>
        <p className="mt-1 text-slate-600">
          Ordered {format(new Date(o.createdAt), "dd MMM yyyy HH:mm")}
          {o.doctor
            ? ` · Dr. ${o.doctor.firstName} ${o.doctor.lastName}`
            : ""}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {o.items.length} test{o.items.length === 1 ? "" : "s"} from doctor:{" "}
          {o.items.map((i) => i.labTest.code).join(", ")}
        </p>
        {o.clinicalNotes ? (
          <p className="mt-2 rounded bg-amber-50 p-2 text-amber-950 ring-1 ring-amber-100">
            Clinical notes: {o.clinicalNotes}
          </p>
        ) : null}
      </div>

      <ol className="grid gap-2 sm:grid-cols-3">
        {steps.map((s, i) => {
          const done = active > i || (i === 2 && isDone);
          const current = active === i && !isDone;
          return (
            <li
              key={s.label}
              className={cn(
                "rounded-lg border px-3 py-2.5",
                done
                  ? "border-teal-200 bg-teal-50"
                  : current
                    ? "border-teal-700 bg-white ring-1 ring-teal-700"
                    : "border-slate-200 bg-slate-50",
              )}
            >
              <p
                className={cn(
                  "text-sm font-semibold",
                  done || current ? "text-teal-900" : "text-slate-500",
                )}
              >
                {s.label}
                {done ? " ✓" : ""}
              </p>
              <p className="text-xs text-slate-500">{s.hint}</p>
            </li>
          );
        })}
      </ol>

      {sendViewOnTop ? step3SendSection : null}

      {/* Step 1 */}
      {canReceive ? (
        <section className="rounded-lg border border-teal-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Step 1 — Receive sample
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Then you will enter results on this page.
          </p>
          <Button
            type="button"
            className="mt-3"
            disabled={receive.isPending}
            onClick={() =>
              receive.mutate(undefined, {
                onSuccess: () => {
                  setSeededFor(null);
                  void order.refetch();
                  toast.success("Sample received — enter results below");
                },
              })
            }
          >
            {receive.isPending ? "Saving…" : "Mark sample received"}
          </Button>
        </section>
      ) : null}

      {/* Step 2 — RESULTS PRIMARY */}
      {showResultsSection ? (
      <section
        ref={resultsSectionRef}
        className={cn(
          "rounded-lg border bg-white p-4 shadow-sm",
          canEditResults && !isDone
            ? "border-teal-200 ring-1 ring-teal-100"
            : "border-slate-200",
        )}
      >
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {isDone
                ? "Final results (sent to doctor)"
                : "Step 2 — Results (primary)"}
            </h2>
            <p className="text-xs text-slate-500">
              {canEditResults
                ? `See and edit every test · ${filledCount}/${o.items.length} filled`
                : canReceive
                  ? "Unlocks after sample is received"
                  : "Read-only"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {resultsEditMode && showSend ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setResultsEditMode(false)}
              >
                Back to send (Step 3)
              </Button>
            ) : null}
            {resultsReady && !isDone && !resultsEditMode ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                Saved — ready to send
              </span>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          {o.items.map((item) => {
            const draft = drafts[item.id] ?? {
              value: "",
              flag: "",
              notes: "",
            };
            return (
              <div
                key={item.id}
                className="rounded-md border border-slate-200 bg-slate-50/60 p-3"
              >
                <p className="font-medium text-slate-900">
                  {item.labTest.code} — {item.labTest.name}
                </p>
                <p className="text-xs text-slate-500">
                  Unit: {item.labTest.unit ?? "—"} · Ref:{" "}
                  {item.labTest.referenceRange ?? "—"}
                </p>

                {isDone && item.result ? (
                  <div className="mt-2 rounded-md bg-white p-3 text-sm ring-1 ring-slate-100">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Result
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {item.result.value}
                      {item.result.unit ? (
                        <span className="ml-1 text-sm font-normal text-slate-600">
                          {item.result.unit}
                        </span>
                      ) : null}
                    </p>
                    {item.result.flag ? (
                      <p className="mt-1 text-xs text-slate-600">
                        Flag: {item.result.flag}
                      </p>
                    ) : null}
                    {item.result.notes ? (
                      <p className="mt-1 text-slate-600">{item.result.notes}</p>
                    ) : null}
                  </div>
                ) : canEditResults ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Value *</Label>
                      <Input
                        placeholder="Type or edit result"
                        value={draft.value}
                        onChange={(e) =>
                          updateDraft(item.id, { value: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Flag</Label>
                      <select
                        className="h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
                        value={draft.flag}
                        onChange={(e) =>
                          updateDraft(item.id, { flag: e.target.value })
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
                        placeholder="Optional"
                        value={draft.notes}
                        onChange={(e) =>
                          updateDraft(item.id, { notes: e.target.value })
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    {canReceive
                      ? "Mark sample received above first."
                      : "Waiting for lab staff."}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {canEditResults && !isDone ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              disabled={enter.isPending || !allFilled}
              onClick={saveResults}
            >
              {enter.isPending
                ? "Saving…"
                : resultsEditMode && showSend
                  ? "Save and return to send"
                  : resultsReady
                    ? "Save result edits"
                    : "Save results"}
            </Button>
            {!allFilled ? (
              <span className="text-xs text-slate-500">
                Fill all {o.items.length} tests to save
              </span>
            ) : resultsReady && resultsEditMode ? (
              <span className="text-xs text-teal-700">
                Save to return to Step 3 — Send to doctor
              </span>
            ) : resultsReady ? (
              <span className="text-xs text-teal-700">
                Edits stay here until you send in step 3
              </span>
            ) : (
              <span className="text-xs text-slate-500">
                After save, step 3 unlocks to send to doctor
              </span>
            )}
          </div>
        ) : null}
      </section>
      ) : null}

      {!sendViewOnTop ? step3SendSection : null}

      {labPaymentSection}

      {!canWork && !isDone ? (
        <p className="text-sm text-amber-800">
          You are signed in as {user?.role ?? "unknown"}. Lab tech or admin is
          needed to enter results.
        </p>
      ) : null}
    </div>
  );
}
