"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingBlock } from "@/components/shared/state-blocks";
import { useCreateInvoice } from "@/features/billing/hooks";
import { createInvoice, issueInvoice } from "@/features/billing/api";
import { fetchEncounters, fetchEncounter } from "@/features/encounters/api";
import { cn } from "@/lib/utils";
import {
  encounterStatusBadge,
  invoiceStatusBadge,
} from "@/components/shared/status-badge";

const CLOSED = new Set(["COMPLETED", "CANCELLED"]);

export function BillingWorkspace({
  embedded,
  highlightEncounterId,
  onReadyForPayment,
}: {
  embedded?: boolean;
  highlightEncounterId?: string;
  onReadyForPayment?: (invoiceId: string) => void;
} = {}) {
  const queryClient = useQueryClient();
  const [encounterId, setEncounterId] = useState("");
  const [lookupId, setLookupId] = useState("");
  const [invoiceLookup, setInvoiceLookup] = useState("");
  const [discountCents, setDiscountCents] = useState(0);
  const [extraDesc, setExtraDesc] = useState("");
  const [extraCents, setExtraCents] = useState(0);
  const [busyEncounterId, setBusyEncounterId] = useState<string | null>(null);

  const encounters = useQuery({
    queryKey: ["encounters", "billing-list"],
    queryFn: () => fetchEncounters(),
  });

  const waitingPayment = useQuery({
    queryKey: ["encounters", "WAITING_PAYMENT"],
    queryFn: () => fetchEncounters({ status: "WAITING_PAYMENT" }),
  });

  const highlight = useQuery({
    queryKey: ["encounters", highlightEncounterId],
    queryFn: () => fetchEncounter(highlightEncounterId!),
    enabled: Boolean(highlightEncounterId),
  });

  const activeVisits = useMemo(() => {
    return (encounters.data ?? [])
      .filter((e) => !CLOSED.has(e.status))
      .sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      )
      .slice(0, 25);
  }, [encounters.data]);

  const create = useCreateInvoice({
    redirectToInvoice: !embedded,
    onCreated: embedded
      ? undefined
      : undefined,
  });

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

  async function createIssueAndPay(encId: string) {
    setBusyEncounterId(encId);
    try {
      let invoiceId: string | undefined;
      try {
        const draft = await createInvoice(encId, {});
        invoiceId = draft.id;
      } catch (e) {
        if (isAxiosError(e) && e.response?.status === 409) {
          const detail = await fetchEncounter(encId);
          invoiceId = detail.invoice?.id;
          if (!invoiceId) throw e;
        } else {
          throw e;
        }
      }
      const issued = await issueInvoice(invoiceId);
      void queryClient.invalidateQueries({ queryKey: ["encounters"] });
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(`${issued.invoiceNumber} issued — ready for payment`);
      if (embedded && onReadyForPayment) {
        onReadyForPayment(issued.id);
      } else {
        window.location.href = `/cashier?invoiceId=${issued.id}`;
      }
    } catch (e) {
      toast.error(
        isAxiosError(e)
          ? (e.response?.data?.details?.message as string) ??
              e.message
          : "Could not create invoice",
      );
    } finally {
      setBusyEncounterId(null);
    }
  }

  const preview = useQuery({
    queryKey: ["encounters", lookupId],
    queryFn: () => fetchEncounter(lookupId),
    enabled: lookupId.length > 30,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {!embedded ? (
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Billing</h1>
          <p className="text-sm text-slate-600">
            Build invoices from encounter data (consultation, verified lab,
            dispensed meds).
          </p>
        </div>
      ) : (
        <p className="text-sm text-slate-600">
          Select a visit below. <strong>Create &amp; issue</strong> adds the
          consultation fee and sends you to Cashier to collect payment.
        </p>
      )}

      {highlightEncounterId && highlight.data ? (
        <div
          className={cn(
            "rounded-lg border-2 border-teal-400 bg-teal-50/50 p-4 shadow-sm space-y-2",
          )}
        >
          <p className="text-sm font-semibold text-teal-900">Current visit</p>
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span>
              {highlight.data.encounterNumber} —{" "}
              {highlight.data.patient.firstName} {highlight.data.patient.lastName}{" "}
              · {highlight.data.service?.name}
            </span>
            {encounterStatusBadge(highlight.data.status)}
          </p>
          {highlight.data.invoice ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">
                Invoice {highlight.data.invoice.invoiceNumber}
              </span>
              {invoiceStatusBadge(highlight.data.invoice.status)}
              {highlight.data.invoice.status === "DRAFT" ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={busyEncounterId === highlightEncounterId}
                  onClick={() => void createIssueAndPay(highlightEncounterId)}
                >
                  Issue &amp; collect payment
                </Button>
              ) : null}
              {["ISSUED", "PARTIALLY_PAID"].includes(
                highlight.data.invoice.status,
              ) &&
              embedded &&
              onReadyForPayment ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => onReadyForPayment(highlight.data.invoice!.id)}
                >
                  Go to cashier
                </Button>
              ) : null}
            </div>
          ) : (
            <Button
              type="button"
              disabled={busyEncounterId === highlightEncounterId}
              onClick={() => void createIssueAndPay(highlightEncounterId)}
            >
              {busyEncounterId === highlightEncounterId
                ? "Working…"
                : "Create & issue invoice → pay"}
            </Button>
          )}
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold">Open visits (bill consultation)</h2>
        <p className="text-xs text-slate-500">
          Payment is per visit, not per registration. Start a visit at Reception
          first.
        </p>
        {encounters.isLoading ? <LoadingBlock /> : null}
        {activeVisits.length === 0 && encounters.isSuccess ? (
          <p className="text-sm text-slate-500">No open visits.</p>
        ) : null}
        <ul className="space-y-2 text-sm">
          {activeVisits.map((enc) => (
            <li
              key={enc.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 rounded border p-2",
                enc.id === highlightEncounterId && "border-teal-400 bg-teal-50/30",
              )}
            >
              <span>
                {enc.encounterNumber}{" "}
                {enc.patient
                  ? `— ${enc.patient.firstName} ${enc.patient.lastName}`
                  : ""}
                <span className="ml-1 inline-flex align-middle">
                  {encounterStatusBadge(enc.status)}
                </span>
                {enc.service ? (
                  <span className="block text-xs text-slate-600">
                    {enc.service.name}
                  </span>
                ) : null}
              </span>
              <Button
                type="button"
                size="sm"
                disabled={busyEncounterId === enc.id}
                onClick={() => void createIssueAndPay(enc.id)}
              >
                {busyEncounterId === enc.id ? "…" : "Create & issue → pay"}
              </Button>
            </li>
          ))}
        </ul>
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
                Create draft only
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold">Open invoice by ID</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Invoice UUID"
            value={invoiceLookup}
            onChange={(e) => setInvoiceLookup(e.target.value.trim())}
          />
          {invoiceLookup ? (
            <Link
              href={
                embedded
                  ? `/front-desk?tab=cashier&invoiceId=${invoiceLookup}`
                  : `/billing/invoices/${invoiceLookup}`
              }
            >
              <Button type="button">Open</Button>
            </Link>
          ) : null}
        </div>
      </div>

      {!embedded ? (
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
              <Input
                value={extraDesc}
                onChange={(e) => setExtraDesc(e.target.value)}
              />
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
        </div>
      ) : null}
    </div>
  );
}
