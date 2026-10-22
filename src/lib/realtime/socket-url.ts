import { env } from "@/lib/env";

/** Socket.IO origin (strip `/api/v1` from REST base URL). */
export function notificationSocketUrl(): string {
  const base = env.NEXT_PUBLIC_API_URL;
  // Same-origin relative API (clinic Docker / nginx) → current page origin.
  if (base.startsWith("/")) {
    if (typeof window !== "undefined") return window.location.origin;
    return "http://localhost:3000";
  }
  try {
    return new URL(base).origin;
  } catch {
    return "http://localhost:4001";
  }
}
