"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function YesNoField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean | null | undefined;
  onChange: (v: boolean | null) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <Label className="mb-1 block text-xs">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium",
            value === true
              ? "bg-teal-700 text-white shadow-sm dark:bg-primary"
              : "bg-slate-100 text-slate-800 ring-1 ring-slate-200 hover:bg-slate-200 dark:bg-muted-bg dark:text-foreground dark:ring-border dark:hover:bg-hover-strong",
            disabled && "cursor-not-allowed opacity-50",
          )}
          onClick={() => onChange(value === true ? null : true)}
        >
          Yes
        </button>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium",
            value === false
              ? "bg-teal-700 text-white shadow-sm dark:bg-primary"
              : "bg-slate-100 text-slate-800 ring-1 ring-slate-200 hover:bg-slate-200 dark:bg-muted-bg dark:text-foreground dark:ring-border dark:hover:bg-hover-strong",
            disabled && "cursor-not-allowed opacity-50",
          )}
          onClick={() => onChange(value === false ? null : false)}
        >
          No
        </button>
      </div>
    </div>
  );
}
