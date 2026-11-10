"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PatientIdentityBar } from "@/components/shared/patient-identity-bar";
import { PaymentRequestPanel } from "@/components/shared/payment-request-panel";
import { ClinicalNotesThread } from "@/components/shared/clinical-notes-thread";
import { ErrorState, LoadingBlock } from "@/components/shared/state-blocks";
import { labOrderStatusBadge } from "@/components/shared/status-badge";
import {
  useEnterLabResults,
  useLabOrder,
  usePatientLabOrders,
  useReceiveLabOrder,
  useVerifyLabOrder,
} from "@/features/laboratory/hooks";
import { useCurrentUser } from "@/features/auth/hooks";
import { ClinicalMessageKind } from "@/features/clinical-messages/types";
import { LabOrderStatus } from "@/types/lab";
import { Role } from "@/types/role";
import type { LabOrder, ResultValueInput } from "@/features/laboratory/api";
import { PrintLabReport } from "@/components/print/print-lab-report";
import { LabCashierCard } from "@/components/laboratory/lab-cashier-card";
import { LabPaper, labItemsToPaperLines } from "@/components/laboratory/lab-paper";
import { uniquePanelLabels } from "@/lib/lab/panels";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Draft = { value: string; flag: string; notes: string };

function PreviousPatientLabs({
  currentOrderId,
  orders,
}: {
  currentOrderId: string;
  orders: LabOrder[];
}) {
  const previous = orders.filter(
    (o) =>
      o.id !== currentOrderId &&
      (o.status === LabOrderStatus.VERIFIED ||
        o.status === LabOrderStatus.RESULT_ENTERED),
  );
  if (previous.length === 0) return null;

  return (
    <section className="rounded-lg border border-border bg-muted-bg/70 p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">
        Previous Lab Results & Doctor Notes
      </h2>
      <p className="mt-0.5 text-xs text-muted">
        Earlier results for this patient — use when correlating new work.
      </p>
      <div className="mt-3 space-y-3">
        {previous.slice(0, 5).map((order) => (
          <article
            key={order.id}
            className="rounded-md border border-border bg-card p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                {order.orderNumber}
              </p>
              <span className="text-xs text-muted">
                {format(new Date(order.createdAt), "dd MMM yyyy HH:mm")}
              </span>
            </div>
            <div className="mt-2">
              <LabPaper
                mode="view"
                lines={labItemsToPaperLines(order.items)}
              />
            </div>
            {order.clinicalNotes ? (
              <p className="mt-2 text-xs text-muted">
                Order notes: {order.clinicalNotes}
              </p>
            ) : null}
            {order.doctorReviewNotes ? (
              <p className="mt-1.5 rounded bg-emerald-50 px-2 py-1.5 text-xs text-emerald-950">
                <span className="font-semibold">Doctor lab notes: </span>
                {order.doctorReviewNotes}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

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
  const patientLabs = usePatientLabOrders(order.data?.patient?.id);
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
  const canSavePartial = filledCount >= 1;
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

    if (results.length < 1) {
      toast.error("Enter at least one test result before saving");
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
          toast.success("Results updated - review and send to doctor");
        } else {
          toast.success("Results saved - review them, then send to doctor");
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
        toast.success("Sent to doctor - Lab results ready");
        router.push("/laboratory");
      },
    });
  }

  const steps = [
    { label: "1. Receive sample", hint: "Confirm specimen arrived" },
    { label: "2. Enter results", hint: "At least one value is enough" },
    { label: "3. Send to doctor", hint: "After ≥1 result is saved" },
  ];

  const sendViewOnTop = showSend && !resultsEditMode;
  const showResultsSection = !sendViewOnTop;

  const step3SendSection =
    showSend || isDone ? (
      <section
        className={cn(
          "rounded-lg border bg-card p-4 shadow-sm",
          showSend ? "border-red-200 ring-1 ring-red-100" : "border-border",
        )}
      >
        <h2 className="text-sm font-semibold text-foreground">
          {isDone ? "Sent to doctor" : "Step 3 - Send to doctor"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {isDone
            ? "Patient is on the doctor’s Lab results ready queue."
            : "Results are saved (partial OK). Blank tests show as Not added. Review, then send to the doctor."}
        </p>

        {showSend ? (
          <div className="mt-3">
            <LabPaper
              mode="view"
              lines={labItemsToPaperLines(o.items, drafts)}
            />
          </div>
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
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PatientIdentityBar patient={o.patient} encounterStatus={o.status} />
        {isDone ? <PrintLabReport order={o} /> : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <aside className="space-y-3 lg:col-span-3">
          {o.encounterId ? (
            <LabCashierCard
              encounterId={o.encounterId}
              orderNumber={o.orderNumber}
              orderStatus={o.status}
            />
          ) : (
            <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                Cashier
              </h3>
              <p className="mt-2 text-xs text-muted">None</p>
            </div>
          )}
        </aside>

        <div className="space-y-4 lg:col-span-9">
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{o.orderNumber}</span>
          {labOrderStatusBadge(o.status)}
          <span className="text-muted">· {o.priority}</span>
        </div>
        <p className="mt-1 text-muted">
          Ordered {format(new Date(o.createdAt), "dd MMM yyyy HH:mm")}
          {o.doctor
            ? ` · Dr. ${o.doctor.firstName} ${o.doctor.lastName}`
            : ""}
        </p>
        <p className="mt-1 text-xs text-muted">
          {o.items.length} line{o.items.length === 1 ? "" : "s"} from doctor:{" "}
          {uniquePanelLabels(o.items.map((i) => i.labTest))}
        </p>
        {o.clinicalNotes ? (
          <p className="mt-2 rounded bg-amber-50 p-2 text-amber-950 ring-1 ring-amber-100">
            Clinical notes from doctor: {o.clinicalNotes}
          </p>
        ) : null}
        {o.doctorReviewNotes ? (
          <p className="mt-2 rounded bg-emerald-50 p-2 text-emerald-950 ring-1 ring-emerald-100">
            Doctor lab notes: {o.doctorReviewNotes}
          </p>
        ) : null}
      </div>

      <PreviousPatientLabs
        currentOrderId={o.id}
        orders={patientLabs.data?.orders ?? []}
      />

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
                    ? "border-teal-700 bg-card ring-1 ring-teal-700"
                    : "border-border bg-muted-bg",
              )}
            >
              <p
                className={cn(
                  "text-sm font-semibold",
                  done || current ? "text-teal-900" : "text-muted",
                )}
              >
                {s.label}
                {done ? " ✓" : ""}
              </p>
              <p className="text-xs text-muted">{s.hint}</p>
            </li>
          );
        })}
      </ol>

      {sendViewOnTop ? step3SendSection : null}

      {/* Step 1 */}
      {canReceive ? (
        <section className="rounded-lg border border-teal-200 bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">
            Step 1 - Receive sample
          </h2>
          <p className="mt-1 text-sm text-muted">
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
                  // Stays on this page for Step 2. Leaves “New from doctor”
                  // only after this receive - Open alone does not move the list.
                  toast.success(
                    "Sample received - order moved to Enter results. Fill values below.",
                  );
                },
              })
            }
          >
            {receive.isPending ? "Saving…" : "Mark sample received"}
          </Button>
        </section>
      ) : null}

      {/* Step 2 - RESULTS PRIMARY */}
      {showResultsSection ? (
      <section
        ref={resultsSectionRef}
        className={cn(
          "rounded-lg border bg-card p-4 shadow-sm",
          canEditResults && !isDone
            ? "border-teal-200 ring-1 ring-teal-100"
            : "border-border",
        )}
      >
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {isDone
                ? "Final results (sent to doctor)"
                : "Step 2 - Results (primary)"}
            </h2>
            <p className="text-xs text-muted">
              {canEditResults
                ? `Enter any available results · ${filledCount}/${o.items.length} filled (partial OK)`
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
                Saved - ready to send
              </span>
            ) : null}
          </div>
        </div>

        {canEditResults && !isDone ? (
          <LabPaper
            mode="edit"
            lines={labItemsToPaperLines(o.items)}
            drafts={drafts}
            onChange={updateDraft}
          />
        ) : (
          <LabPaper
            mode="view"
            lines={labItemsToPaperLines(o.items, isDone ? undefined : drafts)}
          />
        )}
        {!canEditResults && !isDone ? (
          <p className="mt-2 text-sm text-muted">
            {canReceive
              ? "Mark sample received above first."
              : "Waiting for lab staff."}
          </p>
        ) : null}

        {canEditResults && !isDone ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              disabled={enter.isPending || !canSavePartial}
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
            {!canSavePartial ? (
              <span className="text-xs text-muted">
                Enter at least one result to save
              </span>
            ) : !allFilled ? (
              <span className="text-xs text-amber-800">
                {filledCount}/{o.items.length} filled · blank tests show as Not
                added when sent
              </span>
            ) : resultsReady && resultsEditMode ? (
              <span className="text-xs text-teal-700">
                Save to return to Step 3 - Send to doctor
              </span>
            ) : resultsReady ? (
              <span className="text-xs text-teal-700">
                Edits stay here until you send in step 3
              </span>
            ) : (
              <span className="text-xs text-muted">
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

      {o.encounterId ? (
        <ClinicalNotesThread
          encounterId={o.encounterId}
          labOrderId={o.id}
          defaultKind={ClinicalMessageKind.LAB_RESULT}
          readOnly={!canWork}
          title="Clinical notes (lab ↔ doctor)"
        />
      ) : null}
        </div>
      </div>
    </div>
  );
}
