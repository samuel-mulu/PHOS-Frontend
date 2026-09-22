"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export function FormDraftBanner({
  savedAt,
  onRestore,
  onDiscard,
}: {
  savedAt: string;
  onRestore: () => void;
  onDiscard: () => void;
}) {
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950 sm:flex-row sm:items-center sm:justify-between"
    >
      <span>
        Unsaved draft from{" "}
        {format(new Date(savedAt), "HH:mm")} — not submitted to the server.
      </span>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={onRestore}>
          Restore
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDiscard}>
          Discard
        </Button>
      </div>
    </div>
  );
}
