"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  SIDEBAR_STORAGE_KEY,
  isChartWorkspace,
} from "@/lib/layout/workstation-layout";

type SidebarContextValue = {
  sidebarOpen: boolean;
  chartFocus: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

function readStoredOpen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (v === "0") return false;
    if (v === "1") return true;
  } catch {
    /* ignore */
  }
  return true;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const chartFocus = isChartWorkspace(pathname);
  const [sidebarOpen, setSidebarOpenState] = useState(() => !chartFocus);
  const [listPreference, setListPreference] = useState(true);

  useEffect(() => {
    setListPreference(readStoredOpen());
  }, []);

  useEffect(() => {
    if (chartFocus) {
      setSidebarOpenState(false);
    } else {
      setSidebarOpenState(listPreference);
    }
  }, [chartFocus, listPreference, pathname]);

  const setSidebarOpen = useCallback(
    (open: boolean) => {
      setSidebarOpenState(open);
      if (!chartFocus) {
        setListPreference(open);
        try {
          localStorage.setItem(SIDEBAR_STORAGE_KEY, open ? "1" : "0");
        } catch {
          /* ignore */
        }
      }
    },
    [chartFocus],
  );

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(!sidebarOpen);
  }, [setSidebarOpen, sidebarOpen]);

  const value = useMemo(
    () => ({
      sidebarOpen,
      chartFocus,
      toggleSidebar,
      setSidebarOpen,
    }),
    [sidebarOpen, chartFocus, toggleSidebar, setSidebarOpen],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return ctx;
}
