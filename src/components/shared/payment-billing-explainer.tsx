"use client";

type Props = {
  variant: "doctor" | "desk";
  encounterNumber?: string;
  invoiceNumber?: string | null;
  invoiceStatus?: string | null;
};

/** Compact status only - no instructional essays. */
export function PaymentBillingExplainer({
  variant,
  invoiceNumber,
  invoiceStatus,
}: Props) {
  if (variant === "desk") return null;

  if (invoiceNumber) {
    return (
      <p className="text-xs text-muted">
        Invoice {invoiceNumber}
        {invoiceStatus ? ` · ${invoiceStatus}` : ""}
      </p>
    );
  }

  return (
    <p className="text-xs text-muted">
      No invoice yet - desk will bill this visit.
    </p>
  );
}
