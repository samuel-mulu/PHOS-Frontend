"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateService, type Service } from "@/features/facilities/api";
import { normalizeApiError } from "@/lib/api/errors";
import { formatCents } from "@/lib/format/money";

export function ServicePriceRow({
  service,
  onToggleActive,
}: {
  service: Service;
  onToggleActive: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [priceCents, setPriceCents] = useState(String(service.priceCents));
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: () => {
      const parsed = Number.parseInt(priceCents, 10);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error("Enter a valid price in cents");
      }
      return updateService(service.id, { priceCents: parsed });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Consultation fee updated");
      setEditing(false);
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-100 px-2 py-1.5">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900">{service.name}</p>
        <p className="text-xs text-slate-500">
          Code {service.code} · {service.active ? "Active" : "Inactive"}
        </p>
      </div>
      {editing ? (
        <div className="flex items-center gap-1">
          <Input
            className="h-8 w-28 text-sm"
            inputMode="numeric"
            value={priceCents}
            onChange={(e) => setPriceCents(e.target.value)}
            aria-label="Price in cents"
          />
          <Button
            type="button"
            size="sm"
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditing(false);
              setPriceCents(String(service.priceCents));
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tabular-nums text-teal-900">
            {formatCents(service.priceCents)}
          </span>
          <span className="text-[10px] uppercase text-slate-400">visit fee</span>
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
            Edit fee
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onToggleActive}>
            {service.active ? "Off" : "On"}
          </Button>
        </div>
      )}
    </li>
  );
}
