"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ReceptionWorkspace } from "@/components/reception/reception-workspace";
import { BillingWorkspace } from "@/components/billing/billing-workspace";
import { CashierWorkspace } from "@/components/cashier/cashier-workspace";
import { AppointmentsPanel } from "@/components/front-desk/appointments-panel";
import { FrontDeskFlowGuide } from "@/components/front-desk/front-desk-flow-guide";
import { PaymentBillingExplainer } from "@/components/shared/payment-billing-explainer";
import type { Encounter } from "@/features/encounters/api";
import { cn } from "@/lib/utils";

type Tab = "reception" | "appointments" | "billing" | "cashier";

const TABS: { id: Tab; label: string }[] = [
  { id: "reception", label: "Reception" },
  { id: "appointments", label: "Appointments" },
  { id: "billing", label: "Billing" },
  { id: "cashier", label: "Cashier" },
];

export function FrontDeskWorkspace() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as Tab | null;
  const [tab, setTab] = useState<Tab>(
    tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : "reception",
  );

  useEffect(() => {
    if (tabParam && TABS.some((t) => t.id === tabParam)) {
      setTab(tabParam);
    }
  }, [tabParam]);

  const onTab = useCallback((next: Tab, params?: Record<string, string>) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) url.searchParams.set(k, v);
        else url.searchParams.delete(k);
      }
    }
    window.history.replaceState({}, "", url.toString());
  }, []);

  const goBillVisit = useCallback(
    (encounter: Encounter) => {
      onTab("billing", { encounterId: encounter.id, invoiceId: "" });
    },
    [onTab],
  );

  const goPayInvoice = useCallback(
    (invoiceId: string) => {
      onTab("cashier", { invoiceId, encounterId: "" });
    },
    [onTab],
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Front desk</h1>
        <p className="text-sm text-slate-600">
          Register → start visit → issue invoice → take payment.
        </p>
      </div>
      <FrontDeskFlowGuide />
      <PaymentBillingExplainer variant="desk" />
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-teal-800 text-white"
                : "text-slate-600 hover:bg-slate-100",
            )}
            onClick={() => onTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "reception" ? (
        <ReceptionWorkspace embedded onVisitStarted={goBillVisit} />
      ) : null}
      {tab === "appointments" ? <AppointmentsPanel /> : null}
      {tab === "billing" ? (
        <BillingWorkspace
          embedded
          highlightEncounterId={searchParams.get("encounterId") ?? undefined}
          onReadyForPayment={goPayInvoice}
        />
      ) : null}
      {tab === "cashier" ? <CashierWorkspace embedded /> : null}
    </div>
  );
}
