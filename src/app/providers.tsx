"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { createQueryClient } from "@/lib/query/client";
import { NetworkStatusListener } from "@/lib/network/use-network-status";
import { I18nProvider } from "@/i18n/context";
import { AppearanceProvider } from "@/components/layout/appearance-provider";
import { resolveIsDark } from "@/lib/appearance";
import { usePreferencesStore } from "@/stores/preferences-store";

function AppToaster() {
  const theme = usePreferencesStore((s) => s.theme);
  const [toasterTheme, setToasterTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setToasterTheme(resolveIsDark(theme) ? "dark" : "light");
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () =>
      setToasterTheme(mq.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  return (
    <Toaster
      richColors
      closeButton
      position="top-right"
      theme={toasterTheme}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AppearanceProvider>
          <NetworkStatusListener />
          {children}
          <AppToaster />
        </AppearanceProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
