"use client";

import { useEffect } from "react";
import { useNetworkStore } from "./network-store";

export function useNetworkStatus() {
  return useNetworkStore();
}

export function NetworkStatusListener() {
  const setBrowserOffline = useNetworkStore((s) => s.setBrowserOffline);
  const markApiFailure = useNetworkStore((s) => s.markApiFailure);
  const markApiSuccess = useNetworkStore((s) => s.markApiSuccess);

  useEffect(() => {
    const onOffline = () => setBrowserOffline(true);
    const onOnline = () => setBrowserOffline(false);
    setBrowserOffline(!navigator.onLine);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    const onApiDown = () => markApiFailure();
    const onApiUp = () => markApiSuccess();
    window.addEventListener("phos:api-unreachable", onApiDown);
    window.addEventListener("phos:api-reachable", onApiUp);

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("phos:api-unreachable", onApiDown);
      window.removeEventListener("phos:api-reachable", onApiUp);
    };
  }, [setBrowserOffline, markApiFailure, markApiSuccess]);

  return null;
}
