import { api } from "@/lib/api/client";

export type NotificationType =
  | "LAB_ORDER_CREATED"
  | "LAB_RESULT_VERIFIED"
  | "PRESCRIPTION_CREATED"
  | "LOW_STOCK"
  | "EXPIRING_STOCK"
  | "PAYMENT_COMPLETED"
  | "REFUND_COMPLETED"
  | "SYSTEM";

export type AlertPriority = "CRITICAL" | "HIGH" | "NORMAL";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
  priority?: AlertPriority;
};

export type NotificationSummary = {
  total: number;
  byPriority: Record<AlertPriority, number>;
};

export async function fetchNotifications(
  unreadOnly?: boolean,
  priority?: AlertPriority,
) {
  const { data } = await api.get<Notification[]>("/notifications", {
    params: {
      ...(unreadOnly ? { unreadOnly: "true" } : {}),
      ...(priority ? { priority } : {}),
    },
  });
  return data;
}

export async function fetchNotificationSummary() {
  const { data } = await api.get<NotificationSummary>("/notifications/summary");
  return data;
}

export async function markNotificationRead(id: string) {
  const { data } = await api.patch<{ success: boolean }>(
    `/notifications/${id}/read`,
  );
  return data;
}

export async function markAllNotificationsRead() {
  await api.patch("/notifications/read-all");
}
