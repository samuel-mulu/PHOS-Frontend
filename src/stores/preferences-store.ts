"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { FontSizePreference, ThemePreference } from "@/lib/appearance";
import { PREFERENCES_STORAGE_KEY } from "@/lib/appearance";

type PreferencesState = {
  /** Patient Call PA voice. Default off. */
  voiceCallEnabled: boolean;
  /** New-notification sound + toast. Default on. Badge still updates. */
  notificationAlertsEnabled: boolean;
  theme: ThemePreference;
  fontSize: FontSizePreference;
  hasHydrated: boolean;
  setVoiceCallEnabled: (value: boolean) => void;
  setNotificationAlertsEnabled: (value: boolean) => void;
  setTheme: (value: ThemePreference) => void;
  setFontSize: (value: FontSizePreference) => void;
  setHasHydrated: (value: boolean) => void;
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      voiceCallEnabled: false,
      notificationAlertsEnabled: true,
      theme: "system",
      fontSize: "md",
      hasHydrated: false,
      setVoiceCallEnabled: (voiceCallEnabled) => set({ voiceCallEnabled }),
      setNotificationAlertsEnabled: (notificationAlertsEnabled) =>
        set({ notificationAlertsEnabled }),
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: PREFERENCES_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        voiceCallEnabled: state.voiceCallEnabled,
        notificationAlertsEnabled: state.notificationAlertsEnabled,
        theme: state.theme,
        fontSize: state.fontSize,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error("Failed to rehydrate preferences", error);
        }
        void state;
      },
    },
  ),
);

function markHydrated() {
  usePreferencesStore.getState().setHasHydrated(true);
}

if (typeof window !== "undefined") {
  if (usePreferencesStore.persist.hasHydrated()) {
    markHydrated();
  }
  usePreferencesStore.persist.onFinishHydration(markHydrated);
}
