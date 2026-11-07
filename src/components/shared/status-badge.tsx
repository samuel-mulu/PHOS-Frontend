"use client";

import {
  INVOICE_STATE_LABEL,
  invoiceState,
  LINE_STATE_LABEL,
  type InvoiceMoney,
  type LineState,
} from "@/lib/billing/invoice-state";
import { cn } from "@/lib/utils";

type Tone = "green" | "amber" | "red" | "blue" | "slate" | "teal";

const TONE_CLASS: Record<Tone, string> = {
  green:
    "bg-emerald-100 text-emerald-900 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-400/20",
  amber:
    "bg-amber-100 text-amber-950 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/20",
  red: "bg-red-100 text-red-900 ring-red-200 dark:bg-red-400/10 dark:text-red-200 dark:ring-red-400/20",
  blue: "bg-sky-100 text-sky-900 ring-sky-200 dark:bg-sky-400/10 dark:text-sky-200 dark:ring-sky-400/20",
  slate: "bg-muted-bg text-foreground ring-border",
  teal: "bg-teal-100 text-teal-900 ring-teal-200 dark:bg-teal-400/10 dark:text-teal-200 dark:ring-teal-400/20",
};

export function StatusBadge({
  label,
  tone = "slate",
  className,
}: {
  label: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        TONE_CLASS[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}

export function invoiceStatusBadge(status: string) {
  const normalized = status.toUpperCase();
  const label = status.replaceAll("_", " ");
  switch (normalized) {
    case "PAID":
      return <StatusBadge label={label} tone="green" />;
    case "ISSUED":
      return <StatusBadge label={label} tone="amber" />;
    case "PARTIALLY_PAID":
      return <StatusBadge label="PART PAID" tone="blue" />;
    case "DRAFT":
      return <StatusBadge label={label} tone="slate" />;
    case "VOID":
      return <StatusBadge label={label} tone="red" />;
    default:
      return <StatusBadge label={label} tone="slate" />;
  }
}

/** Money state of a whole invoice: Paid / Part paid / Pay later / Waived / Not paid. */
export function invoiceStateBadge(inv: InvoiceMoney | null | undefined) {
  if (!inv) return null;
  if (inv.status === "VOID") return <StatusBadge label="Void" tone="red" />;
  if (inv.status === "DRAFT") return <StatusBadge label="Draft" tone="slate" />;
  const state = invoiceState(inv);
  const tone: Tone =
    state === "PAID"
      ? "green"
      : state === "WAIVED" || state === "PARTIAL"
        ? "blue"
        : "amber";
  return <StatusBadge label={INVOICE_STATE_LABEL[state]} tone={tone} />;
}

/** Money state of one invoice line. While at the cashier, unpaid shows "At cashier". */
export function LineStateBadge({
  state,
  atCashier,
}: {
  state: LineState;
  atCashier: boolean;
}) {
  if ((state === "DUE" || state === "PART_PAID") && atCashier)
    return <StatusBadge label="At cashier" tone="amber" />;
  const tone: Tone =
    state === "PAID"
      ? "green"
      : state === "WAIVED"
        ? "blue"
        : state === "DUE"
          ? "slate"
          : "amber";
  return <StatusBadge label={LINE_STATE_LABEL[state]} tone={tone} />;
}

/** Desk-friendly location for an open visit (read-only tracking). */
export function visitLocationLabel(
  status: string,
  paymentReturnStation?: string | null,
): string {
  switch (status) {
    case "REGISTERED":
      return "Registered";
    case "WAITING_TRIAGE":
      return "Waiting triage";
    case "IN_TRIAGE":
      return "In triage";
    case "WAITING_DOCTOR":
      return "Waiting for doctor";
    case "IN_CONSULTATION":
      return "With doctor";
    case "WAITING_LAB":
      return "In lab";
    case "WAITING_REVIEW":
      return "Lab result at doctor";
    case "WAITING_PHARMACY":
      return "Pharmacy";
    case "WAITING_PAYMENT":
      if (paymentReturnStation === "LAB") return "At cashier (lab)";
      if (paymentReturnStation === "DOCTOR") return "At cashier (doctor)";
      if (paymentReturnStation === "TRIAGE") return "At cashier (triage)";
      if (paymentReturnStation === "PHARMACY") return "At cashier (pharmacy)";
      return "At cashier";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status.replaceAll("_", " ");
  }
}

export function encounterStatusBadge(status: string) {
  const normalized = status.toUpperCase();
  const label = status.replaceAll("_", " ");
  switch (normalized) {
    case "COMPLETED":
      return <StatusBadge label={label} tone="green" />;
    case "WAITING_PAYMENT":
    case "WAITING_REVIEW":
      return <StatusBadge label={label} tone="amber" />;
    case "CANCELLED":
      return <StatusBadge label={label} tone="red" />;
    case "IN_CONSULTATION":
    case "IN_TRIAGE":
      return <StatusBadge label={label} tone="blue" />;
    case "WAITING_DOCTOR":
    case "WAITING_TRIAGE":
    case "WAITING_LAB":
    case "WAITING_PHARMACY":
      return <StatusBadge label={label} tone="teal" />;
    default:
      return <StatusBadge label={label} tone="slate" />;
  }
}

/** Shared doctor ↔ lab vocabulary for lab order lifecycle. */
export function labOrderStatusLabel(status: string): string {
  switch (status.toUpperCase()) {
    case "ORDERED":
      return "Sent to lab";
    case "RECEIVED":
      return "Lab received sample";
    case "PROCESSING":
      return "In progress";
    case "RESULT_ENTERED":
      return "Awaiting verification";
    case "VERIFIED":
      return "Result ready";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status.replaceAll("_", " ");
  }
}

export function labOrderStatusTone(status: string): Tone {
  switch (status.toUpperCase()) {
    case "ORDERED":
      return "slate";
    case "RECEIVED":
      return "blue";
    case "PROCESSING":
    case "RESULT_ENTERED":
      return "amber";
    case "VERIFIED":
      return "green";
    case "CANCELLED":
      return "red";
    default:
      return "slate";
  }
}

export function labOrderStatusBadge(status: string) {
  return (
    <StatusBadge
      label={labOrderStatusLabel(status)}
      tone={labOrderStatusTone(status)}
    />
  );
}

/** Progress steps for doctor/lab UI (ORDERED → VERIFIED). */
export const LAB_PROGRESS_STEPS = [
  { key: "ORDERED", label: "Sent" },
  { key: "RECEIVED", label: "Received" },
  { key: "PROCESSING", label: "Processing" },
  { key: "VERIFIED", label: "Verified" },
] as const;

export function labOrderStepIndex(status: string): number {
  switch (status.toUpperCase()) {
    case "ORDERED":
      return 0;
    case "RECEIVED":
      return 1;
    case "PROCESSING":
    case "RESULT_ENTERED":
      return 2;
    case "VERIFIED":
      return 3;
    default:
      return -1;
  }
}
