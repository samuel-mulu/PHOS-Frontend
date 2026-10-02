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
  const [discountCents, setDiscountCents] = useState(0);
  const [extraDesc, setExtraDesc] = useState("");
  const [extraCents, setExtraCents] = useState(0);
  const [busyEncounterId, setBusyEncounterId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const encounters = useQuery({
    queryKey: ["encounters", "billing-list"],
    queryFn: () => fetchEncounters(),
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

  function goCollect(invoiceId: string, invoiceNumber?: string) {
    void queryClient.invalidateQueries({ queryKey: ["encounters"] });
    void queryClient.invalidateQueries({ queryKey: ["invoices"] });
    toast.success(
      invoiceNumber
        ? `${invoiceNumber} ready to collect`
        : "Ready to collect payment",
    );
    if (embedded && onReadyForPayment) {
      onReadyForPayment(invoiceId);
    } else {
      window.location.href = `/cashier?invoiceId=${invoiceId}`;
    }
  }

  async function createIssueAndPay(encId: string) {
    setBusyEncounterId(encId);
    try {
      const detail = await fetchEncounter(encId);
      let invoice = detail.invoice ?? null;

      if (!invoice) {
        try {
          const created = await createInvoice(encId, {});
          invoice = {
            id: created.id,
            invoiceNumber: created.invoiceNumber,
            status: created.status,
          };
        } catch (e) {
          // Race: another request created it first
          if (isAxiosError(e) && e.response?.status === 409) {
            const again = await fetchEncounter(encId);
            invoice = again.invoice ?? null;
            if (!invoice) throw e;
          } else {
            throw e;
          }
        }
      }

      if (invoice.status === "PAID") {
        toast.message(`${invoice.invoiceNumber} is already paid`);
        goCollect(invoice.id, invoice.invoiceNumber);
        return;
      }

      if (invoice.status === "VOIDED" || invoice.status === "CANCELLED") {
        toast.error("This invoice was voided — cannot collect payment");
        return;
      }

      if (["ISSUED", "PARTIALLY_PAID"].includes(invoice.status)) {
        goCollect(invoice.id, invoice.invoiceNumber);
        return;
      }

      // DRAFT (or unknown): issue, then collect
      try {
        const issued = await issueInvoice(invoice.id);
        goCollect(issued.id, issued.invoiceNumber);
      } catch (e) {
        if (isAxiosError(e) && e.response?.status === 409) {
          // Already issued between checks — still go to cashier
          goCollect(invoice.id, invoice.invoiceNumber);
          return;
        }
        throw e;
      }
    } catch (e) {
      toast.error(
        isAxiosError(e)
          ? (e.response?.data?.details?.message as string) ??
              (e.response?.data?.message as string) ??
              e.message
          : "Could not prepare invoice",
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
        <h1 className="text-xl font-semibold text-slate-900">Billing</h1>
      ) : null}

      {highlightEncounterId && highlight.data ? (
        <div className="space-y-3 rounded-lg border-2 border-teal-400 bg-teal-50/60 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
            Ready to bill
          </p>
          <div className="flex flex-wrap items-center gap-2 text-base text-slate-900">
            <span className="font-semibold">
              {highlight.data.patient.firstName}{" "}
              {highlight.data.patient.lastName}
            </span>
            <span className="text-slate-500">
              · {highlight.data.encounterNumber}
            </span>
            {highlight.data.service ? (
              <span className="text-slate-600">
                · {highlight.data.service.name}
              </span>
            ) : null}
            {encounterStatusBadge(highlight.data.status)}
          </div>
          {highlight.data.invoice ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">
                {highlight.data.invoice.invoiceNumber}
              </span>
              {invoiceStatusBadge(highlight.data.invoice.status)}
              {highlight.data.invoice.status === "DRAFT" ? (
                <Button
                  type="button"
                  disabled={busyEncounterId === highlightEncounterId}
                  onClick={() => void createIssueAndPay(highlightEncounterId)}
                >
                  Issue & collect payment
                </Button>
              ) : null}
              {["ISSUED", "PARTIALLY_PAID"].includes(
                highlight.data.invoice.status,
              ) &&
              embedded &&
              onReadyForPayment ? (
                <Button
                  type="button"
                  onClick={() => onReadyForPayment(highlight.data.invoice!.id)}
                >
                  Collect payment
                </Button>
              ) : null}
            </div>
          ) : (
            <Button
              type="button"
              size="lg"
              className="w-full sm:w-auto"
              disabled={busyEncounterId === highlightEncounterId}
              onClick={() => void createIssueAndPay(highlightEncounterId)}
            >
              {busyEncounterId === highlightEncounterId
                ? "Preparing…"
                : "Collect consultation fee"}
            </Button>
          )}
        </div>
      ) : null}

      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold">Open visits</h2>
        {encounters.isLoading ? <LoadingBlock /> : null}
        {activeVisits.length === 0 && encounters.isSuccess ? (
          <p className="text-sm text-slate-500">
            No open visits. Start one from Reception.
          </p>
        ) : null}
        <ul className="space-y-2 text-sm">
          {activeVisits.map((enc) => (
            <li
              key={enc.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 p-3",
                enc.id === highlightEncounterId &&
                  "border-teal-400 bg-teal-50/40",
              )}
            >
              <div>
                <p className="font-medium text-slate-900">
                  {enc.patient
                    ? `${enc.patient.firstName} ${enc.patient.lastName}`
                    : enc.encounterNumber}
                </p>
                <p className="text-xs text-slate-600">
                  {enc.encounterNumber}
                  {enc.service ? ` · ${enc.service.name}` : ""}
                  <span className="ml-1 inline-flex align-middle">
                    {encounterStatusBadge(enc.status)}
                  </span>
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={busyEncounterId === enc.id}
                onClick={() => void createIssueAndPay(enc.id)}
              >
                {busyEncounterId === enc.id ? "…" : "Collect fee"}
              </Button>
            </li>
          ))}
        </ul>
      </div>

      {!embedded ? (
        <div className="space-y-3">
          <button
            type="button"
            className="text-xs font-medium text-slate-500 underline"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? "Hide advanced" : "Advanced options"}
          </button>
          {showAdvanced ? (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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
                  <Label className="text-xs">Extra line description</Label>
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
                  {preview.data.encounterNumber} · {preview.data.status} ·{" "}
                  {preview.data.service?.name}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {!embedded ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold">Open invoice</h2>
          <InvoiceLookup />
        </div>
      ) : null}
    </div>
  );
}

function InvoiceLookup() {
  const [invoiceLookup, setInvoiceLookup] = useState("");
  return (
    <div className="flex gap-2">
      <Input
        placeholder="Invoice ID"
        value={invoiceLookup}
        onChange={(e) => setInvoiceLookup(e.target.value.trim())}
      />
      {invoiceLookup ? (
        <Link href={`/billing/invoices/${invoiceLookup}`}>
          <Button type="button">Open</Button>
        </Link>
      ) : null}
    </div>
  );
}
