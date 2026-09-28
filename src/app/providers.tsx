"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { createQueryClient } from "@/lib/query/client";
import { NetworkStatusListener } from "@/lib/network/use-network-status";
import { I18nProvider } from "@/i18n/context";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
      <NetworkStatusListener />
      {children}
      <Toaster richColors closeButton position="top-right" />
      </I18nProvider>
    </QueryClientProvider>
  );
}
