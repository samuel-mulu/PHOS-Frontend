"use client";

import { useLayoutEffect, useEffect } from "react";
import { applyAppearance } from "@/lib/appearance";
import { usePreferencesStore } from "@/stores/preferences-store";

export function AppearanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = usePreferencesStore((s) => s.theme);
  const fontSize = usePreferencesStore((s) => s.fontSize);
  const hasHydrated = usePreferencesStore((s) => s.hasHydrated);

  // useLayoutEffect runs before paint so React hydration cannot flash light cards.
  useLayoutEffect(() => {
    applyAppearance(theme, fontSize);
  }, [theme, fontSize, hasHydrated]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyAppearance("system", fontSize);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, fontSize]);

  return children;
}
