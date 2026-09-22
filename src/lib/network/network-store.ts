"use client";

import { create } from "zustand";

type NetworkState = {
  browserOffline: boolean;
  apiUnreachable: boolean;
  lastApiFailureAt: number | null;
  setBrowserOffline: (offline: boolean) => void;
  markApiFailure: () => void;
  markApiSuccess: () => void;
};

export const useNetworkStore = create<NetworkState>((set) => ({
  browserOffline: false,
  apiUnreachable: false,
  lastApiFailureAt: null,
  setBrowserOffline: (browserOffline) => set({ browserOffline }),
  markApiFailure: () =>
    set({ apiUnreachable: true, lastApiFailureAt: Date.now() }),
  markApiSuccess: () => set({ apiUnreachable: false }),
}));
