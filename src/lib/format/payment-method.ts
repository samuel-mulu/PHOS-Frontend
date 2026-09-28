import { PaymentMethod, type PaymentMethod as PaymentMethodType } from "@/types/finance";

const LABELS: Record<PaymentMethodType, string> = {
  [PaymentMethod.CASH]: "Cash",
  [PaymentMethod.CARD]: "Card (POS)",
  [PaymentMethod.TELEBIRR]: "Telebirr",
  [PaymentMethod.BANK_TRANSFER]: "Bank transfer",
  [PaymentMethod.INSURANCE]: "Insurance",
  [PaymentMethod.OTHER]: "Other",
};

export function paymentMethodLabel(method: string): string {
  return LABELS[method as PaymentMethodType] ?? method.replaceAll("_", " ");
}
