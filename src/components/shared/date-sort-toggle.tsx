"use client";

import { cn } from "@/lib/utils";
import type { DateSortDirection } from "@/lib/queues/sort";

export function DateSortToggle({
  value,
  onChange,
  className,
}: {
  value: DateSortDirection;
  onChange: (value: DateSortDirection) => void;
  className?: string;
}) {
  return (
    <div
      className={cn("inline-flex items-center gap-1.5", className)}
      role="group"
      aria-label="Sort by date"
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        Sort
      </span>
      <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
        <SortOption
          active={value === "latest"}
          onClick={() => onChange("latest")}
          title="Newest first (default)"
        >
          Latest
        </SortOption>
        <SortOption
          active={value === "oldest"}
          onClick={() => onChange("oldest")}
          title="Oldest first - longest waiting on top"
        >
          Oldest
        </SortOption>
      </div>
    </div>
  );
}

function SortOption({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded px-2 py-0.5 text-[11px] font-semibold transition-colors",
        active
          ? "bg-white text-teal-800 shadow-sm"
          : "text-slate-500 hover:text-slate-700",
      )}
    >
      {children}
    </button>
  );
}
