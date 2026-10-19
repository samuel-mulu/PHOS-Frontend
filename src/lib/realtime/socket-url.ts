import { env } from "@/lib/env";

/** Socket.IO origin (strip `/api/v1` from REST base URL). */
export function notificationSocketUrl(): string {
  try {
    return new URL(env.NEXT_PUBLIC_API_URL).origin;
  } catch {
    return "http://localhost:4001";
  }
}
