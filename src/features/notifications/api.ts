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

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
};

export async function fetchNotifications(unreadOnly?: boolean) {
  const { data } = await api.get<Notification[]>("/notifications", {
    params: unreadOnly ? { unreadOnly: "true" } : undefined,
  });
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
