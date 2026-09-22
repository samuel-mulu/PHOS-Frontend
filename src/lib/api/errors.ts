import { isAxiosError } from "axios";

export type ApiErrorBody = {
  statusCode?: number;
  error?: string;
  details?: { message?: string | string[] };
  path?: string;
  timestamp?: string;
};

export class ApiError extends Error {
  statusCode: number;
  body?: ApiErrorBody;

  constructor(message: string, statusCode: number, body?: ApiErrorBody) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.body = body;
  }
}

export type MutationOutcome = "failed" | "unknown";

export function classifyMutationError(error: unknown): {
  message: string;
  outcome: MutationOutcome;
} {
  const normalized = normalizeApiError(error);
  if (normalized.statusCode === 0 || normalized.statusCode === 504) {
    return {
      message:
        "Request timed out. Do not submit again until you confirm whether the server saved the change.",
      outcome: "unknown",
    };
  }
  return { message: normalized.message, outcome: "failed" };
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (isAxiosError<ApiErrorBody>(error)) {
    if (!error.response) {
      const code = error.code;
      if (code === "ECONNABORTED") {
        return new ApiError(
          "Request timed out. The server may still be processing this action.",
          504,
        );
      }
      if (error.message === "Network Error" || code === "ERR_NETWORK") {
        return new ApiError(
          "Network unavailable. Check your connection and try again.",
          0,
        );
      }
    }
    const status = error.response?.status ?? 500;
    const body = error.response?.data;
    const detail = body?.details;
    let message = body?.error ?? error.message;
    if (detail && typeof detail === "object" && "message" in detail) {
      const m = detail.message;
      message = Array.isArray(m) ? m.join(", ") : (m ?? message);
    }
    if (status === 401) message = message || "Session expired. Please sign in again.";
    if (status === 403) message = message || "You do not have permission for this action.";
    if (status === 404) message = message || "The requested record was not found.";
    if (status === 409) message = message || "This action conflicts with current data.";
    if (status >= 500) message = message || "Temporary server error. Try again shortly.";
    return new ApiError(message, status, body);
  }

  if (error instanceof Error) {
    return new ApiError(error.message, 500);
  }

  return new ApiError("Something went wrong", 500);
}
