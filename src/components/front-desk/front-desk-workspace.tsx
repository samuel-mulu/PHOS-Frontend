"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { ReceptionWorkspace } from "@/components/reception/reception-workspace";
import { BillingWorkspace } from "@/components/billing/billing-workspace";
import { CashierWorkspace } from "@/components/cashier/cashier-workspace";
import { AppointmentsPanel } from "@/components/front-desk/appointments-panel";
import type { Encounter } from "@/features/encounters/api";
import { fetchEncounters } from "@/features/encounters/api";
import { useQueue } from "@/features/queues/hooks";
import { useAppointments } from "@/features/appointments/hooks";
import { QueueStation } from "@/types/encounter";
import { AppointmentStatus } from "@/types/appointment";
import { cn } from "@/lib/utils";

type Tab = "reception" | "appointments" | "billing" | "cashier";

const TABS: { id: Tab; label: string }[] = [
  { id: "reception", label: "Reception" },
  { id: "appointments", label: "Appointments" },
  { id: "billing", label: "Billing" },
  { id: "cashier", label: "Cashier" },
];

function RedBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function FrontDeskWorkspace() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as Tab | null;
  const [tab, setTab] = useState<Tab>(
    tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : "reception",
  );

  const triageQueue = useQueue(QueueStation.TRIAGE, 8_000);
  const cashierQueue = useQueue(QueueStation.CASHIER, 8_000);
  const today = format(new Date(), "yyyy-MM-dd");
  const appointments = useAppointments({ from: today, to: today });
  const encounters = useQuery({
    queryKey: ["encounters", "front-desk-billing-badge"],
    queryFn: () => fetchEncounters(),
    refetchInterval: 20_000,
  });

  const triageWaiting = triageQueue.data?.length ?? 0;
  const cashierWaiting = cashierQueue.data?.length ?? 0;

  const appointmentsToday = useMemo(() => {
    const rows = appointments.data ?? [];
    return rows.filter(
      (a) =>
        a.status === AppointmentStatus.SCHEDULED ||
        a.status === AppointmentStatus.CHECKED_IN,
    ).length;
  }, [appointments.data]);

  const billingAttention = useMemo(() => {
    return (encounters.data ?? []).filter(
      (e) => e.status === "WAITING_PAYMENT",
    ).length;
  }, [encounters.data]);

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

  function badgeFor(id: Tab): number {
    switch (id) {
      case "reception":
        return triageWaiting;
      case "appointments":
        return appointmentsToday;
      case "billing":
        return Math.min(billingAttention, 99);
      case "cashier":
        return cashierWaiting;
      default:
        return 0;
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Front desk</h1>
        <p className="text-sm text-slate-600">
          Reception → Billing → Cashier. Red badges update live.
        </p>
      </div>

      <nav
        className="flex flex-wrap gap-2 border-b border-slate-200 pb-2"
        aria-label="Front desk"
      >
        {TABS.map((t) => {
          const badge = badgeFor(t.id);
          const emphasize =
            (t.id === "cashier" || t.id === "reception") && badge > 0;
          return (
            <button
              key={t.id}
              type="button"
              className={cn(
                "inline-flex items-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
                tab === t.id
                  ? "bg-teal-800 text-white"
                  : emphasize
                    ? "bg-red-50 text-red-900 ring-1 ring-red-200 hover:bg-red-100"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200",
              )}
              onClick={() => onTab(t.id)}
            >
              {t.label}
              <RedBadge count={badge} />
            </button>
          );
        })}
      </nav>

      {tab === "reception" ? (
        <ReceptionWorkspace
          embedded
          initialPatientId={searchParams.get("patientId") ?? undefined}
          onVisitStarted={goBillVisit}
          onGoCashier={() => onTab("cashier")}
          cashierWaiting={cashierWaiting}
        />
      ) : null}
      {tab === "appointments" ? <AppointmentsPanel /> : null}
      {tab === "billing" ? (
        <BillingWorkspace
          embedded
          highlightEncounterId={searchParams.get("encounterId") ?? undefined}
          onReadyForPayment={goPayInvoice}
        />
      ) : null}
      {tab === "cashier" ? (
        <CashierWorkspace
          embedded
          onInvoiceFullyPaid={() => onTab("cashier")}
        />
      ) : null}
    </div>
  );
}
