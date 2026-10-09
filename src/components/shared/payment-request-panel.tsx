"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePaymentRequest } from "@/features/encounters/hooks";
import { cn } from "@/lib/utils";

export type PaymentReturnStation = "DOCTOR" | "LAB" | "PHARMACY" | "TRIAGE";

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
 * Clinical station: charge a service line and send patient to cashier.
 * After payment, backend returns patient to `returnStation`.
 */
export function PaymentRequestPanel({
  encounterId,
  returnStation,
  disabled,
  className,
  title = "Send payment request",
}: {
  encounterId: string;
  returnStation: PaymentReturnStation;
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const request = usePaymentRequest(encounterId);
  const [description, setDescription] = useState("");
  const [amountEtb, setAmountEtb] = useState("");

  const cents = etbToCents(amountEtb);
  const canSend =
    !disabled &&
    description.trim().length > 0 &&
    cents != null &&
    !request.isPending;

  const returnLabel = RETURN_LABELS[returnStation];

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
        Patient goes to cashier. After payment they return to {returnLabel}{" "}
        automatically.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Service
          </Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Consultation, X-Ray…"
            disabled={disabled || request.isPending}
          />
        </div>
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
            disabled={disabled || request.isPending}
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
              description: description.trim(),
              amountCents: cents,
              returnStation,
            },
            {
              onSuccess: () => {
                setDescription("");
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
