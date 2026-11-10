import { PaymentMethod, type PaymentMethod as PaymentMethodType } from "@/types/finance";

const LABELS: Record<PaymentMethodType, string> = {
  [PaymentMethod.CASH]: "Cash",
  [PaymentMethod.CARD]: "Card (POS)",
  [PaymentMethod.TELEBIRR]: "Telebirr",
  [PaymentMethod.BANK_TRANSFER]: "Mobile Banking",
  [PaymentMethod.INSURANCE]: "Insurance",
  [PaymentMethod.OTHER]: "Other",
};

/** Methods offered when collecting payment. */
export const COLLECT_PAYMENT_METHODS: PaymentMethodType[] = [
  PaymentMethod.CASH,
  PaymentMethod.BANK_TRANSFER,
  PaymentMethod.TELEBIRR,
];

export function paymentMethodLabel(method: string): string {
  return LABELS[method as PaymentMethodType] ?? method.replaceAll("_", " ");
}
