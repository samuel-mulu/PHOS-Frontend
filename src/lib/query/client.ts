"use client";

import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/errors";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        networkMode: "offlineFirst",
        retry: (failureCount, error) => {
          const status =
            error instanceof ApiError
              ? error.statusCode
              : (error as { statusCode?: number }).statusCode;
          if (status === 401 || status === 403 || status === 404) return false;
          if (status === 0) return failureCount < 1;
          return failureCount < 2;
        },
      },
    },
  });
}
