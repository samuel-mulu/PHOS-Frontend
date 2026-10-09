"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TableLayoutValue = {
  fullscreen: boolean;
  toggleFullscreen: () => void;
  setFullscreen: (open: boolean) => void;
};

const TableLayoutContext = createContext<TableLayoutValue | null>(null);

export function useTableLayout() {
  return useContext(TableLayoutContext);
}

/** Fullscreen toggle — works inside ExpandablePanel or alone with local state. */
export function TableFullscreenButton({
  fullscreen,
  onToggle,
  className,
}: {
  fullscreen: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant={fullscreen ? "default" : "outline"}
      size="sm"
      className={cn(
        "shrink-0 gap-1.5",
        fullscreen && "bg-teal-800 hover:bg-teal-900",
        className,
      )}
      onClick={onToggle}
      aria-pressed={fullscreen}
      aria-label={fullscreen ? "Exit full screen" : "Full screen table"}
      title={fullscreen ? "Exit full screen (Esc)" : "Full screen"}
    >
      {fullscreen ? (
        <Minimize2 className="h-4 w-4" aria-hidden />
      ) : (
        <Maximize2 className="h-4 w-4" aria-hidden />
      )}
      <span className="hidden sm:inline">
        {fullscreen ? "Exit full screen" : "Full screen"}
      </span>
    </Button>
  );
}

/**
 * Wraps a table section (title, filters/search, table).
 * Full screen expands the whole panel so filters + table stay together.
 */
export function ExpandablePanel({
  title,
  toolbar,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  /** Search / filters — stays visible in full screen. */
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const titleId = useId();
  const [fullscreen, setFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Let open modals (above this overlay) own Escape first.
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      setFullscreen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  const toggleFullscreen = useCallback(() => {
    setFullscreen((v) => !v);
  }, []);

  const value = useMemo(
    () => ({
      fullscreen,
      toggleFullscreen,
      setFullscreen,
    }),
    [fullscreen, toggleFullscreen],
  );

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3">
      <div className="min-w-0 flex-1">
        {typeof title === "string" ? (
          <h2
            id={titleId}
            className="truncate text-sm font-semibold text-slate-900"
          >
            {title}
          </h2>
        ) : (
          title
        )}
      </div>
      <TableFullscreenButton
        fullscreen={fullscreen}
        onToggle={toggleFullscreen}
      />
    </div>
  );

  const body = (
    <TableLayoutContext.Provider value={value}>
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          fullscreen ? "overflow-hidden" : null,
        )}
      >
        {toolbar ? (
          <div
            className={cn(
              "shrink-0 space-y-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3",
              !fullscreen && "bg-transparent px-0 py-0 border-0",
            )}
          >
            {toolbar}
          </div>
        ) : null}
        <div
          className={cn(
            "min-h-0 flex-1",
            fullscreen ? "overflow-auto p-4" : null,
            bodyClassName,
          )}
        >
          {children}
        </div>
      </div>
    </TableLayoutContext.Provider>
  );

  if (fullscreen && mounted) {
    return createPortal(
      <div
        className="fixed inset-0 z-[70] flex flex-col bg-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby={typeof title === "string" ? titleId : undefined}
      >
        {header}
        {body}
      </div>,
      document.body,
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm",
        className,
      )}
    >
      {header}
      <div className={cn("space-y-4 p-4 md:p-5", bodyClassName)}>{body}</div>
    </div>
  );
}
