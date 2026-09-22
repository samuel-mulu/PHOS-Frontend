export const InvoiceItemType = {
  CONSULTATION: "CONSULTATION",
  LAB: "LAB",
  MEDICINE: "MEDICINE",
  PROCEDURE: "PROCEDURE",
  OTHER: "OTHER",
} as const;

export type InvoiceItemType =
  (typeof InvoiceItemType)[keyof typeof InvoiceItemType];

export const PaymentMethod = {
  CASH: "CASH",
  TELEBIRR: "TELEBIRR",
  BANK_TRANSFER: "BANK_TRANSFER",
  INSURANCE: "INSURANCE",
  OTHER: "OTHER",
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];
