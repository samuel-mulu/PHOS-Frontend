"use client";

import { useMemo, useState } from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePaymentRequest } from "@/features/encounters/hooks";
import { useAllServices } from "@/features/facilities/hooks";
import { formatCents } from "@/lib/format/money";
import { cn } from "@/lib/utils";

export type PaymentReturnStation = "DOCTOR" | "LAB" | "PHARMACY" | "TRIAGE";

const CUSTOM = "__custom__";

function etbToCents(etb: string): number | null {
  const n = Number(etb);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

const RETURN_LABELS: Record<PaymentReturnStation, string> = {
  DOCTOR: "doctor",
  LAB: "lab",
  PHARMACY: "pharmacy",
  TRIAGE: "triage",
};

/**
 * Clinical station: charge a catalog service (or a custom line) and send
 * the patient to cashier. After payment, backend returns them to `returnStation`.
 */
export function PaymentRequestPanel({
  encounterId,
  returnStation,
  disabled,
  className,
  title = "Send to cashier",
}: {
  encounterId: string;
  returnStation: PaymentReturnStation;
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const request = usePaymentRequest(encounterId);
  const catalog = useAllServices();
  const [serviceId, setServiceId] = useState("");
  const [customName, setCustomName] = useState("");
  const [amountEtb, setAmountEtb] = useState("");

  const priced = useMemo(
    () =>
      (catalog.data ?? [])
        .filter((s) => s.active && s.priceCents > 0)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [catalog.data],
  );

  const selected = priced.find((s) => s.id === serviceId);
  const isCustom = serviceId === CUSTOM;
  const description = isCustom ? customName.trim() : (selected?.name ?? "");
  const cents = etbToCents(amountEtb);
  const canSend =
    !disabled &&
    description.length > 0 &&
    cents != null &&
    !request.isPending;

  const returnLabel = RETURN_LABELS[returnStation];

  function applyService(id: string) {
    setServiceId(id);
    if (id === CUSTOM || id === "") {
      setCustomName("");
      setAmountEtb("");
      return;
    }
    const service = priced.find((s) => s.id === id);
    if (service) {
      setCustomName("");
      setAmountEtb((service.priceCents / 100).toFixed(2));
    }
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-sky-200 bg-white p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-sky-700" aria-hidden />
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Pick a priced service, or add another. Patient pays at cashier, then
        returns to {returnLabel}.
      </p>

      <div className="mt-3 space-y-3">
        <div>
          <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Service
          </Label>
          <select
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
            value={serviceId}
            disabled={disabled || request.isPending}
            onChange={(e) => applyService(e.target.value)}
          >
            <option value="">Select a service…</option>
            {priced.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {formatCents(s.priceCents)}
              </option>
            ))}
            <option value={CUSTOM}>Other — type name and amount</option>
          </select>
        </div>

        {isCustom ? (
          <div>
            <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Service name
            </Label>
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. Extra dressing, X-Ray…"
              disabled={disabled || request.isPending}
            />
          </div>
        ) : null}

        <div>
          <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Amount (ETB)
          </Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={amountEtb}
            onChange={(e) => setAmountEtb(e.target.value)}
            placeholder="0.00"
            disabled={disabled || request.isPending || !serviceId}
          />
        </div>
      </div>

      <Button
        type="button"
        className="mt-3 bg-emerald-700 hover:bg-emerald-800"
        disabled={!canSend}
        onClick={() => {
          if (cents == null) return;
          request.mutate(
            {
              description,
              amountCents: cents,
              returnStation,
            },
            {
              onSuccess: () => {
                setServiceId("");
                setCustomName("");
                setAmountEtb("");
              },
            },
          );
        }}
      >
        {request.isPending ? "Sending…" : "Send to cashier"}
      </Button>
    </div>
  );
}
