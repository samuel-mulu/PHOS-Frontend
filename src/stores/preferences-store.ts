"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type PreferencesState = {
  /** Patient Call PA voice. Default off. */
  voiceCallEnabled: boolean;
  /** New-notification sound + toast. Default on. Badge still updates. */
  notificationAlertsEnabled: boolean;
  hasHydrated: boolean;
  setVoiceCallEnabled: (value: boolean) => void;
  setNotificationAlertsEnabled: (value: boolean) => void;
  setHasHydrated: (value: boolean) => void;
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      voiceCallEnabled: false,
      notificationAlertsEnabled: true,
      hasHydrated: false,
      setVoiceCallEnabled: (voiceCallEnabled) => set({ voiceCallEnabled }),
      setNotificationAlertsEnabled: (notificationAlertsEnabled) =>
        set({ notificationAlertsEnabled }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "phos-preferences",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        voiceCallEnabled: state.voiceCallEnabled,
        notificationAlertsEnabled: state.notificationAlertsEnabled,
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
