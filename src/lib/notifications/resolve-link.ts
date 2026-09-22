import type { Notification, NotificationType } from "@/features/notifications/api";

const TYPE_HINT: Partial<Record<NotificationType, string>> = {
  LAB_ORDER_CREATED: "Laboratory",
  LAB_RESULT_VERIFIED: "Laboratory",
  PRESCRIPTION_CREATED: "Pharmacy",
  LOW_STOCK: "Inventory",
  EXPIRING_STOCK: "Inventory",
  PAYMENT_COMPLETED: "Cashier",
  REFUND_COMPLETED: "Cashier",
  SYSTEM: "System",
};

export function notificationCategory(type: NotificationType): string {
  return TYPE_HINT[type] ?? "General";
}

export function notificationHref(n: Notification): string | null {
  if (!n.entityId) return null;
  const t = n.entityType?.toLowerCase();
  if (t === "laborder" || t === "lab_order") {
    return `/laboratory/orders/${n.entityId}`;
  }
  if (t === "prescription") {
    return `/pharmacy/prescriptions/${n.entityId}`;
  }
  if (t === "encounter") {
    return `/doctor/${n.entityId}`;
  }
  if (t === "invoice") {
    return `/billing/invoices/${n.entityId}`;
  }
  if (t === "payment") {
    return `/cashier`;
  }
  switch (n.type) {
    case "LAB_ORDER_CREATED":
    case "LAB_RESULT_VERIFIED":
      return `/laboratory/orders/${n.entityId}`;
    case "PRESCRIPTION_CREATED":
      return `/pharmacy/prescriptions/${n.entityId}`;
    case "LOW_STOCK":
    case "EXPIRING_STOCK":
      return `/inventory`;
    case "PAYMENT_COMPLETED":
    case "REFUND_COMPLETED":
      return `/cashier`;
    default:
      return null;
  }
}
