"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { QueryStaleBanner } from "@/components/shared/query-stale-banner";
import { LoadingBlock, ErrorState } from "@/components/shared/state-blocks";
import {
  useAdminLabTests,
  useCreateLabTest,
  useSetLabTestActive,
  useUpdateLabTest,
} from "@/features/laboratory/hooks";
import { cn } from "@/lib/utils";

function etbToCents(etb: string) {
  const n = Number(etb);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function centsToEtb(cents: number) {
  return (cents / 100).toFixed(2);
}

export function AdminLabTestsPanel() {
  const tests = useAdminLabTests();
  const create = useCreateLabTest();
  const update = useUpdateLabTest();
  const toggle = useSetLabTestActive();

  const [form, setForm] = useState({
    code: "",
    name: "",
    category: "",
    unit: "",
    priceEtb: "",
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [editPriceEtb, setEditPriceEtb] = useState("");
  const [editName, setEditName] = useState("");
  const [filter, setFilter] = useState("");

  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = tests.data ?? [];
    if (!q) return list;
    return list.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        (t.category ?? "").toLowerCase().includes(q),
    );
  }, [tests.data, filter]);

  if (tests.isLoading) return <LoadingBlock label="Loading lab tests" />;
  if (tests.isError) {
    return (
      <ErrorState
        message="Could not load lab catalog."
        onRetry={() => void tests.refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <QueryStaleBanner query={tests} />

      <Card className="space-y-3 p-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Add lab test</h2>
          <p className="text-xs text-slate-500">
            New tests appear on the doctor order chips when enabled.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label className="mb-1 block text-xs">Code</Label>
            <Input
              value={form.code}
              onChange={(e) =>
                setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
              }
              placeholder="e.g. LIPID"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-1 block text-xs">Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Display name"
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Category</Label>
            <Input
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
              placeholder="Chemistry"
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Price (ETB)</Label>
            <Input
              value={form.priceEtb}
              onChange={(e) =>
                setForm((f) => ({ ...f, priceEtb: e.target.value }))
              }
              placeholder="150.00"
              inputMode="decimal"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <Label className="mb-1 block text-xs">Unit (optional)</Label>
            <Input
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              placeholder="mg/dL"
            />
          </div>
          <Button
            type="button"
            disabled={
              !form.code.trim() ||
              !form.name.trim() ||
              etbToCents(form.priceEtb) === null ||
              create.isPending
            }
            onClick={() => {
              const priceCents = etbToCents(form.priceEtb);
              if (priceCents === null) return;
              create.mutate(
                {
                  code: form.code.trim(),
                  name: form.name.trim(),
                  category: form.category.trim() || undefined,
                  unit: form.unit.trim() || undefined,
                  priceCents,
                  active: true,
                },
                {
                  onSuccess: () =>
                    setForm({
                      code: "",
                      name: "",
                      category: "",
                      unit: "",
                      priceEtb: "",
                    }),
                },
              );
            }}
          >
            {create.isPending ? "Adding…" : "Add test"}
          </Button>
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Lab catalog ({tests.data?.length ?? 0})
            </h2>
            <p className="text-xs text-slate-500">
              Toggle off to hide from doctor ordering. Price is billed when ordered.
            </p>
          </div>
          <Input
            className="max-w-xs"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search code, name, category…"
          />
        </div>

        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
          {rows.map((t) => {
            const editing = editId === t.id;
            return (
              <li
                key={t.id}
                className={cn(
                  "flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between",
                  !t.active && "bg-slate-50 opacity-75",
                )}
              >
                <div className="min-w-0 flex-1">
                  {editing ? (
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Name"
                      />
                      <Input
                        value={editPriceEtb}
                        onChange={(e) => setEditPriceEtb(e.target.value)}
                        placeholder="Price ETB"
                        inputMode="decimal"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={update.isPending}
                          onClick={() => {
                            const priceCents = etbToCents(editPriceEtb);
                            if (priceCents === null || !editName.trim()) return;
                            update.mutate(
                              {
                                id: t.id,
                                name: editName.trim(),
                                priceCents,
                              },
                              { onSuccess: () => setEditId(null) },
                            );
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setEditId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-slate-900">
                        {t.name}{" "}
                        <span className="font-normal text-slate-500">
                          ({t.code})
                        </span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {t.category ?? "Uncategorized"} · {" "}
                        {centsToEtb(t.priceCents)} ETB
                        {t.unit ? ` · ${t.unit}` : ""}
                        {!t.active ? " · Off" : ""}
                      </p>
                    </>
                  )}
                </div>
                {!editing ? (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditId(t.id);
                        setEditName(t.name);
                        setEditPriceEtb(centsToEtb(t.priceCents));
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={t.active ? "outline" : "default"}
                      disabled={toggle.isPending}
                      onClick={() =>
                        toggle.mutate({ id: t.id, active: !t.active })
                      }
                    >
                      {t.active ? "Turn off" : "Turn on"}
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
          {rows.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-slate-500">
              No tests match.
            </li>
          ) : null}
        </ul>
      </Card>
    </div>
  );
}
