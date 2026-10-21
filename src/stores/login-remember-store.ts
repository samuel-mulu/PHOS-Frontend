"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type LoginRememberState = {
  remember: boolean;
  email: string;
  password: string;
  setRemember: (remember: boolean) => void;
  saveCredentials: (email: string, password: string) => void;
  clearSavedPassword: () => void;
};

export const useLoginRememberStore = create<LoginRememberState>()(
  persist(
    (set, get) => ({
      remember: false,
      email: "",
      password: "",
      setRemember: (remember) => {
        if (!remember) {
          set({ remember: false, password: "" });
        } else {
          set({ remember: true });
        }
      },
      saveCredentials: (email, password) => {
        if (!get().remember) {
          set({ email: "", password: "", remember: false });
          return;
        }
        set({ remember: true, email, password });
      },
      clearSavedPassword: () => set({ password: "", remember: false, email: "" }),
    }),
    {
      name: "phos-login-remember",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) =>
        state.remember
          ? {
              remember: state.remember,
              email: state.email,
              password: state.password,
            }
          : { remember: false, email: "", password: "" },
    },
  ),
);
