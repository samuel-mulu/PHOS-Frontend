"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthUserSummary } from "@/types/auth";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUserSummary | null;
  /** False until sessionStorage rehydrate finishes (critical on hard refresh). */
  hasHydrated: boolean;
  setSession: (payload: {
    accessToken: string;
    refreshToken: string;
    user: AuthUserSummary;
  }) => void;
  clearSession: () => void;
  setHasHydrated: (value: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      hasHydrated: false,
      setSession: ({ accessToken, refreshToken, user }) =>
        set({ accessToken, refreshToken, user }),
      clearSession: () =>
        set({ accessToken: null, refreshToken: null, user: null }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "phos-auth",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error("Failed to rehydrate auth session", error);
        }
        void state;
      },
    },
  ),
);

function markHydrated() {
  useAuthStore.getState().setHasHydrated(true);
}

if (typeof window !== "undefined") {
  // Cover both "already done" and "about to finish" hydrate paths.
  if (useAuthStore.persist.hasHydrated()) {
    markHydrated();
  }
  useAuthStore.persist.onFinishHydration(markHydrated);
}
