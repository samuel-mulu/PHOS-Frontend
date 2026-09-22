"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { createQueryClient } from "@/lib/query/client";
import { NetworkStatusListener } from "@/lib/network/use-network-status";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <NetworkStatusListener />
      {children}
      <Toaster richColors closeButton position="top-right" />
    </QueryClientProvider>
  );
}
