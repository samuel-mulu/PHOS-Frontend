"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCents } from "@/lib/format/money";

export type FreeRequestState = {
  enabled: boolean;
  amountEtb: string;
  reason: string;
};

export const EMPTY_FREE_REQUEST: FreeRequestState = {
  enabled: false,
  amountEtb: "",
  reason: "",
};

/** Validated free request for the API, or an error message to show. */
export function freeRequestPayload(
  state: FreeRequestState,
  totalCents: number | null,
):
  | { ok: true; freeCents?: number; freeReason?: string }
  | { ok: false; error: string } {
  if (!state.enabled) return { ok: true };
  const n = Number(state.amountEtb);
  const cents = Number.isFinite(n) ? Math.round(n * 100) : Number.NaN;
  if (!Number.isFinite(cents) || cents < 1)
    return { ok: false, error: "Enter the free amount" };
  if (totalCents != null && cents > totalCents)
    return {
      ok: false,
      error: `Free amount cannot be more than ${formatCents(totalCents)}`,
    };
  if (state.reason.trim().length < 3)
    return { ok: false, error: "Write a reason for making it free" };
  return { ok: true, freeCents: cents, freeReason: state.reason.trim() };
}

/**
 * Doctor: "Make free (waive)" - the cashier sees the request and confirms it.
 * Full amount by default; can be lowered for part-free.
 */
export function FreeRequestFields({
  value,
  onChange,
  totalCents,
  disabled,
}: {
  value: FreeRequestState;
  onChange: (next: FreeRequestState) => void;
  totalCents: number | null;
  disabled?: boolean;
}) {
  const full = totalCents != null ? (totalCents / 100).toFixed(2) : "";
  return (
    <div className="rounded-md border border-violet-200 bg-violet-50/60 p-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-violet-950">
        <input
          type="checkbox"
          className="h-4 w-4 accent-violet-700"
          checked={value.enabled}
          disabled={disabled}
          onChange={(e) =>
            onChange({
              ...value,
              enabled: e.target.checked,
              amountEtb: e.target.checked ? value.amountEtb || full : value.amountEtb,
            })
          }
        />
        Make free (waive)
      </label>
      {value.enabled ? (
        <div className="mt-2 grid gap-2 sm:grid-cols-[8rem_1fr]">
          <div>
            <Label className="mb-1 block text-3xs font-semibold uppercase tracking-wide text-muted">
              Free amount (ETB)
            </Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={value.amountEtb}
              placeholder={full || "0.00"}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, amountEtb: e.target.value })}
            />
          </div>
          <div>
            <Label className="mb-1 block text-3xs font-semibold uppercase tracking-wide text-muted">
              Reason for free
            </Label>
            <Input
              value={value.reason}
              placeholder="e.g. follow-up of same problem, staff family"
              disabled={disabled}
              onChange={(e) => onChange({ ...value, reason: e.target.value })}
            />
          </div>
          <p className="text-2xs text-violet-900 sm:col-span-2">
            Cashier confirms the free amount; anything above it is collected.
          </p>
        </div>
      ) : null}
    </div>
  );
}
