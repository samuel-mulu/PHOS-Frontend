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
  const [priceEtb, setPriceEtb] = useState(
    (service.priceCents / 100).toFixed(2),
  );
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: () => {
      const etb = Number.parseFloat(priceEtb);
      if (!Number.isFinite(etb) || etb < 0) {
        throw new Error("Enter a valid price in ETB");
      }
      return updateService(service.id, {
        priceCents: Math.round(etb * 100),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["services"] });
      toast.success("Fee updated");
      setEditing(false);
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-100 px-2 py-1.5">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900">{service.name}</p>
        <p className="text-xs text-slate-500">
          {service.code} · {service.active ? "Active" : "Inactive"}
        </p>
      </div>
      {editing ? (
        <div className="flex items-center gap-1">
          <Input
            className="h-8 w-24 text-sm"
            inputMode="decimal"
            value={priceEtb}
            onChange={(e) => setPriceEtb(e.target.value)}
            aria-label="Price in ETB"
          />
          <span className="text-xs text-slate-500">ETB</span>
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
              setPriceEtb((service.priceCents / 100).toFixed(2));
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
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setEditing(true)}
          >
            Edit
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onToggleActive}>
            {service.active ? "Off" : "On"}
          </Button>
        </div>
      )}
    </li>
  );
}
