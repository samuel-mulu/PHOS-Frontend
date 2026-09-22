"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type DraftEnvelope<T> = {
  savedAt: string;
  values: T;
};

export function useFormDraft<T extends Record<string, unknown>>(
  key: string,
  values: T,
  options?: { enabled?: boolean; debounceMs?: number },
) {
  const enabled = options?.enabled ?? true;
  const debounceMs = options?.debounceMs ?? 800;
  const storageKey = `phos:draft:${key}`;
  const [pendingDraft, setPendingDraft] = useState<DraftEnvelope<T> | null>(
    null,
  );
  const hydrated = useRef(false);

  useEffect(() => {
    if (!enabled || hydrated.current) return;
    hydrated.current = true;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as DraftEnvelope<T>;
      if (parsed?.values) setPendingDraft(parsed);
    } catch {
      sessionStorage.removeItem(storageKey);
    }
  }, [enabled, storageKey]);

  useEffect(() => {
    if (!enabled) return;
    const t = window.setTimeout(() => {
      try {
        const envelope: DraftEnvelope<T> = {
          savedAt: new Date().toISOString(),
          values,
        };
        sessionStorage.setItem(storageKey, JSON.stringify(envelope));
      } catch {
        /* quota */
      }
    }, debounceMs);
    return () => window.clearTimeout(t);
  }, [values, enabled, debounceMs, storageKey]);

  const clearDraft = useCallback(() => {
    sessionStorage.removeItem(storageKey);
    setPendingDraft(null);
  }, [storageKey]);

  const dismissDraft = useCallback(() => {
    sessionStorage.removeItem(storageKey);
    setPendingDraft(null);
  }, [storageKey]);

  return { pendingDraft, clearDraft, dismissDraft };
}
