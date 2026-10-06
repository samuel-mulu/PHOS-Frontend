"use client";

import { cn } from "@/lib/utils";

type Tone = "green" | "amber" | "red" | "blue" | "slate" | "teal";

const TONE_CLASS: Record<Tone, string> = {
  green: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  amber: "bg-amber-100 text-amber-950 ring-amber-200",
  red: "bg-red-100 text-red-900 ring-red-200",
  blue: "bg-sky-100 text-sky-900 ring-sky-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  teal: "bg-teal-100 text-teal-900 ring-teal-200",
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
    case "PARTIALLY_PAID":
      return <StatusBadge label={label} tone="amber" />;
    case "DRAFT":
      return <StatusBadge label={label} tone="slate" />;
    case "VOID":
      return <StatusBadge label={label} tone="red" />;
    default:
      return <StatusBadge label={label} tone="slate" />;
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
