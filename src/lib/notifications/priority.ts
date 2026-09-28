import type { Notification, NotificationType } from "@/features/notifications/api";

export type AlertPriority = "CRITICAL" | "HIGH" | "NORMAL";

export function notificationPriority(
  type: NotificationType,
  title?: string,
): AlertPriority {
  switch (type) {
    case "LOW_STOCK":
    case "EXPIRING_STOCK":
      return "CRITICAL";
    case "LAB_ORDER_CREATED":
    case "LAB_RESULT_VERIFIED":
      return "HIGH";
    case "SYSTEM":
      if (title?.toLowerCase().includes("payment requested")) return "HIGH";
      return "NORMAL";
    default:
      return "NORMAL";
  }
}

export function priorityLabel(p: AlertPriority): string {
  switch (p) {
    case "CRITICAL":
      return "Critical";
    case "HIGH":
      return "High";
    default:
      return "Normal";
  }
}

export function priorityForNotification(n: Notification): AlertPriority {
  return n.priority ?? notificationPriority(n.type, n.title);
}
