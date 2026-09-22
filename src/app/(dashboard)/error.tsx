"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">
        Workspace error
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        This screen failed to load. You can retry or use the sidebar to navigate
        elsewhere.
      </p>
      <Button type="button" className="mt-4" onClick={reset}>
        Retry
      </Button>
    </div>
  );
}
