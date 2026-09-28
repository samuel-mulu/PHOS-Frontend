"use client";

import { Button } from "@/components/ui/button";

export function SimpleDialog({
  open,
  title,
  children,
  primaryLabel = "OK",
  onPrimary,
  onClose,
  secondaryLabel,
  onSecondary,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  primaryLabel?: string;
  onPrimary: () => void;
  onClose: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="simple-dialog-title"
        className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 id="simple-dialog-title" className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        <div className="mt-3 text-sm text-slate-700">{children}</div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {secondaryLabel && onSecondary ? (
            <Button type="button" variant="outline" onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          ) : null}
          <Button type="button" onClick={onPrimary}>
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
