"use client";

import { cn } from "@/lib/utils";
import { useTableLayout } from "@/components/shared/table-layout";

export function DataTable({
  className,
  children,
  /** Cap height so rows scroll inside the table; columns still scroll horizontally. */
  maxHeightClassName,
}: {
  className?: string;
  children: React.ReactNode;
  maxHeightClassName?: string | false;
}) {
  const layout = useTableLayout();
  const fullscreen = layout?.fullscreen ?? false;

  const heightClass =
    maxHeightClassName === false
      ? null
      : maxHeightClassName != null
        ? maxHeightClassName
        : fullscreen
          ? "max-h-[calc(100vh-11rem)]"
          : "max-h-[min(32rem,65vh)]";

  return (
    <div
      className={cn(
        "overflow-auto rounded-md border border-slate-200",
        heightClass,
        className,
      )}
    >
      <table className="w-full min-w-[640px] border-collapse text-sm">
        {children}
      </table>
    </div>
  );
}

export function DataTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="sticky top-0 z-[1] bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500 shadow-[0_1px_0_0_rgb(226_232_240)]">
      {children}
    </thead>
  );
}

export function DataTableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>;
}

export function DataTableRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <tr className={cn("hover:bg-slate-50/80", className)}>{children}</tr>;
}

export function DataTableCell({
  children,
  className,
  stickyRight,
}: {
  children: React.ReactNode;
  className?: string;
  stickyRight?: boolean;
}) {
  return (
    <td
      className={cn(
        "whitespace-nowrap px-3 py-2.5 text-slate-800",
        stickyRight &&
          "sticky right-0 z-[1] border-l border-slate-100 bg-white shadow-[-6px_0_8px_-6px_rgba(15,23,42,0.12)]",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function DataTableHeaderCell({
  children,
  className,
  stickyRight,
}: {
  children: React.ReactNode;
  className?: string;
  stickyRight?: boolean;
}) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-3 py-2.5",
        stickyRight &&
          "sticky right-0 z-[2] border-l border-slate-200 bg-slate-50 shadow-[-6px_0_8px_-6px_rgba(15,23,42,0.12)]",
        className,
      )}
    >
      {children}
    </th>
  );
}
