"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingBlock } from "@/components/shared/state-blocks";
import { useCreateInvoice } from "@/features/billing/hooks";
import { fetchEncounters, fetchEncounter } from "@/features/encounters/api";
import Link from "next/link";

export function BillingWorkspace() {
  const [encounterId, setEncounterId] = useState("");
  const [lookupId, setLookupId] = useState("");
  const [invoiceLookup, setInvoiceLookup] = useState("");
  const [discountCents, setDiscountCents] = useState(0);
  const [extraDesc, setExtraDesc] = useState("");
  const [extraCents, setExtraCents] = useState(0);

  const waitingPayment = useQuery({
    queryKey: ["encounters", "WAITING_PAYMENT"],
    queryFn: () => fetchEncounters({ status: "WAITING_PAYMENT" }),
  });

  const preview = useQuery({
    queryKey: ["encounters", lookupId],
    queryFn: () => fetchEncounter(lookupId),
    enabled: lookupId.length > 30,
  });

  const create = useCreateInvoice();

  function createFromEncounter(id: string) {
    create.mutate({
      encounterId: id,
      discountCents: discountCents || undefined,
      additionalItems:
        extraDesc && extraCents > 0
          ? [
              {
                type: "OTHER",
                description: extraDesc,
                quantity: 1,
                unitPriceCents: extraCents,
              },
            ]
          : undefined,
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Billing</h1>
        <p className="text-sm text-slate-600">
          Build invoices from encounter data (consultation, verified lab, dispensed meds).
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold">Open invoice</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Invoice UUID"
            value={invoiceLookup}
            onChange={(e) => setInvoiceLookup(e.target.value.trim())}
          />
          {invoiceLookup ? (
            <Link href={`/billing/invoices/${invoiceLookup}`}>
              <Button type="button">Open</Button>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold">Encounters awaiting payment</h2>
        {waitingPayment.isLoading ? <LoadingBlock /> : null}
        {waitingPayment.data?.length === 0 ? (
          <p className="text-sm text-slate-500">None right now.</p>
        ) : null}
        <ul className="space-y-2 text-sm">
          {waitingPayment.data?.map((enc) => (
            <li
              key={enc.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded border p-2"
            >
              <span>
                {enc.encounterNumber}{" "}
                {enc.patient
                  ? `— ${enc.patient.firstName} ${enc.patient.lastName}`
                  : ""}
              </span>
              <Button
                type="button"
                size="sm"
                disabled={create.isPending}
                onClick={() => createFromEncounter(enc.id)}
              >
                Create invoice
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold">Create by encounter ID</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="text-xs">Encounter UUID</Label>
            <Input
              value={encounterId}
              onChange={(e) => setEncounterId(e.target.value.trim())}
            />
          </div>
          <div>
            <Label className="text-xs">Discount (cents)</Label>
            <Input
              type="number"
              min={0}
              value={discountCents}
              onChange={(e) => setDiscountCents(Number(e.target.value))}
            />
          </div>
          <div>
            <Label className="text-xs">Extra line (OTHER) description</Label>
            <Input value={extraDesc} onChange={(e) => setExtraDesc(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Extra line price (cents)</Label>
            <Input
              type="number"
              min={0}
              value={extraCents}
              onChange={(e) => setExtraCents(Number(e.target.value))}
            />
          </div>
        </div>
        <Button
          type="button"
          disabled={!encounterId || create.isPending}
          onClick={() => {
            setLookupId(encounterId);
            createFromEncounter(encounterId);
          }}
        >
          {create.isPending ? "Creating…" : "Create draft invoice"}
        </Button>
        {preview.data ? (
          <p className="text-xs text-slate-600">
            Preview: {preview.data.encounterNumber} · {preview.data.status} ·{" "}
            {preview.data.service?.name}
          </p>
        ) : null}
        <p className="text-xs text-slate-500">
          Prices for consultation, lab, and medicine lines are resolved server-side.
        </p>
      </div>
    </div>
  );
}
