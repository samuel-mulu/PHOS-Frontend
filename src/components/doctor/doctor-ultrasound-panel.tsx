"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingBlock } from "@/components/shared/state-blocks";
import { SimpleDialog } from "@/components/shared/simple-dialog";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/format/money";
import { useAllServices } from "@/features/facilities/hooks";
import type { Service } from "@/features/facilities/api";
import { usePaymentRequest } from "@/features/encounters/hooks";

function isUltrasoundService(service: Service) {
  if (!service.active || service.priceCents < 1) return false;
  const hay = `${service.code} ${service.name}`.toLowerCase();
  return (
    service.code.toUpperCase() === "USG" ||
    hay.includes("ultrasound") ||
    hay.includes("usg") ||
    hay.includes("sono")
  );
}

export function DoctorUltrasoundPanel({
  encounterId,
  isFinalized,
  encounterStatus,
  paymentReturnStation,
  disabled,
}: {
  encounterId: string;
  isFinalized: boolean;
  encounterStatus?: string;
  paymentReturnStation?: string | null;
  disabled?: boolean;
}) {
  const services = useAllServices();
  const request = usePaymentRequest(encounterId);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const atCashierForUltrasound =
    encounterStatus === "WAITING_PAYMENT" &&
    (paymentReturnStation === "DOCTOR" || !paymentReturnStation);

  const imaging = useMemo(
    () => (services.data ?? []).filter(isUltrasoundService),
    [services.data],
  );

  const chosen = imaging.filter((s) => selected.includes(s.id));
  const totalCents = chosen.reduce((sum, s) => sum + s.priceCents, 0);
  const busy = disabled || request.isPending || isFinalized;
  const canSend = !busy && chosen.length > 0 && totalCents >= 1;

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">Ultrasound</h2>
        <p className="mt-1 text-xs text-slate-500">
          Ultrasound is done here. Patient pays at cashier / front desk, then
          returns to your queue.
        </p>
      </div>

      {atCashierForUltrasound ? (
        <p
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
          role="status"
        >
          Patient is at cashier. After payment they return here so you can do
          the scan.
        </p>
      ) : null}

      {isFinalized ? (
        <p className="text-sm text-slate-500">
          Consultation finalized — new ultrasound charges are closed.
        </p>
      ) : (
        <>
          <p className="text-xs font-medium text-slate-600">Tap to select</p>
          {services.isLoading ? (
            <LoadingBlock label="Loading ultrasound services" />
          ) : null}
          {services.isSuccess && imaging.length === 0 ? (
            <p className="text-sm text-amber-800">
              No ultrasound service in catalog. Ask admin to add USG /
              Ultrasound.
            </p>
          ) : null}
          <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto rounded-md border border-slate-100 p-2">
            {imaging.map((s) => {
              const on = selected.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggle(s.id)}
                  disabled={busy}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-left text-xs font-medium transition-colors",
                    on
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                      : "border-sky-200 bg-sky-50 text-sky-950 hover:border-sky-400 hover:bg-sky-100",
                  )}
                >
                  {s.name}
                  <span className={cn("ml-1 font-normal", on ? "text-white/80" : "text-slate-500")}>
                    {formatCents(s.priceCents)}
                  </span>
                </button>
              );
            })}
          </div>
          {chosen.length > 0 ? (
            <p className="text-sm font-medium text-slate-800">
              Total {formatCents(totalCents)}
            </p>
          ) : null}
          <Button
            type="button"
            className="bg-emerald-700 hover:bg-emerald-800"
            disabled={!canSend}
            onClick={() => setConfirmOpen(true)}
          >
            {request.isPending
              ? "Sending…"
              : `Send to cashier — ultrasound${chosen.length ? ` (${chosen.length})` : ""}`}
          </Button>
          <p className="text-xs text-slate-500">
            Patient pays at cashier / front desk, then returns here. You do the
            ultrasound.
          </p>
        </>
      )}

      <SimpleDialog
        open={confirmOpen}
        title="Send to cashier — ultrasound"
        primaryLabel={request.isPending ? "Sending…" : "Send to cashier"}
        secondaryLabel="Cancel"
        onSecondary={() => setConfirmOpen(false)}
        onClose={() => {
          if (!request.isPending) setConfirmOpen(false);
        }}
        onPrimary={() => {
          if (!canSend) return;
          request.mutate(
            {
              description: chosen.map((s) => s.name).join(", "),
              amountCents: totalCents,
              returnStation: "DOCTOR",
            },
            {
              onSuccess: () => {
                setSelected([]);
                setConfirmOpen(false);
              },
            },
          );
        }}
      >
        <p className="text-slate-600">
          Patient pays this amount at cashier / front desk, then returns here
          for the scan.
        </p>
        <ul className="mt-3 space-y-1.5">
          {chosen.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span>{s.name}</span>
              <span className="shrink-0 font-medium tabular-nums">
                {formatCents(s.priceCents)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-base font-semibold text-slate-900">
          Total to collect: {formatCents(totalCents)}
        </p>
      </SimpleDialog>
    </div>
  );
}
