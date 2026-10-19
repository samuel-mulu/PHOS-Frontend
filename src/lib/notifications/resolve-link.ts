import type { Notification, NotificationType } from "@/features/notifications/api";

const TYPE_HINT: Partial<Record<NotificationType, string>> = {
  LAB_ORDER_CREATED: "Laboratory",
  LAB_RESULT_VERIFIED: "Laboratory",
  PRESCRIPTION_CREATED: "Pharmacy",
  LOW_STOCK: "Inventory",
  EXPIRING_STOCK: "Inventory",
  PAYMENT_COMPLETED: "Cashier",
  REFUND_COMPLETED: "Cashier",
  SYSTEM: "System / billing",
};

export function notificationCategory(type: NotificationType): string {
  return TYPE_HINT[type] ?? "General";
}

function isDeskPaymentAlert(n: Notification): boolean {
  if (n.type !== "SYSTEM") return false;
  const hay = `${n.title} ${n.message}`.toLowerCase();
  return (
    hay.includes("cashier") ||
    hay.includes("payment") ||
    hay.includes("invoice")
  );
}

export function notificationHref(n: Notification): string | null {
  const t = n.entityType?.toLowerCase() ?? "";

  if (n.entityId) {
    if (t === "laborder" || t === "lab_order") {
      // Doctors get a queue ping; lab staff open the order.
      if (n.type === "LAB_RESULT_VERIFIED") return `/doctor`;
      return `/laboratory/orders/${n.entityId}`;
    }
    if (t === "prescription") {
      return `/pharmacy/prescriptions/${n.entityId}`;
    }
    if (t === "encounter") {
      if (isDeskPaymentAlert(n)) return `/cashier`;
      return `/doctor/${n.entityId}`;
    }
    if (t === "invoice") {
      return `/billing/invoices/${n.entityId}`;
    }
    if (t === "payment" || t === "refund") {
      return `/cashier`;
    }
  }

  switch (n.type) {
    case "LAB_ORDER_CREATED":
      return n.entityId ? `/laboratory/orders/${n.entityId}` : `/laboratory`;
    case "LAB_RESULT_VERIFIED":
      return `/doctor`;
    case "PRESCRIPTION_CREATED":
      return n.entityId
        ? `/pharmacy/prescriptions/${n.entityId}`
        : `/pharmacy`;
    case "LOW_STOCK":
    case "EXPIRING_STOCK":
      return `/inventory`;
    case "PAYMENT_COMPLETED":
    case "REFUND_COMPLETED":
      return t === "encounter" && n.entityId
        ? `/doctor/${n.entityId}`
        : `/cashier`;
    case "SYSTEM":
      return isDeskPaymentAlert(n) ? `/cashier` : null;
    default:
      return null;
  }
}
