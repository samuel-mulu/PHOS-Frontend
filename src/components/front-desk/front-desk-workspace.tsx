"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ReceptionWorkspace } from "@/components/reception/reception-workspace";
import { CashierWorkspace } from "@/components/cashier/cashier-workspace";
import { AppointmentsPanel } from "@/components/front-desk/appointments-panel";
import { PaymentsReportPanel } from "@/components/payments/payments-report-panel";
import { ExpenseRecordPanel } from "@/components/expenses/expense-record-panel";
import { ExpensesReportPanel } from "@/components/expenses/expenses-report-panel";
import { useQueue } from "@/features/queues/hooks";
import { useAppointments } from "@/features/appointments/hooks";
import { QueueStation } from "@/types/encounter";
import { AppointmentStatus } from "@/types/appointment";
import { cn } from "@/lib/utils";

type Tab = "reception" | "appointments" | "payments" | "expenses" | "report";

const TABS: { id: Tab; label: string }[] = [
  { id: "reception", label: "Reception" },
  { id: "appointments", label: "Appointments" },
  { id: "payments", label: "Payments" },
  { id: "expenses", label: "Expenses" },
  { id: "report", label: "Report" },
];

function resolveTab(raw: string | null): Tab {
  if (raw === "billing" || raw === "cashier") return "payments";
  if (
    raw === "reception" ||
    raw === "appointments" ||
    raw === "payments" ||
    raw === "expenses" ||
    raw === "report"
  ) {
    return raw;
  }
  return "reception";
}

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
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(() => resolveTab(tabParam));

  const triageQueue = useQueue(QueueStation.TRIAGE, 8_000);
  const cashierQueue = useQueue(QueueStation.CASHIER, 8_000);
  const today = format(new Date(), "yyyy-MM-dd");
  const appointments = useAppointments({ from: today, to: today });

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

  useEffect(() => {
    setTab(resolveTab(tabParam));
  }, [tabParam]);

  const onTab = useCallback((next: Tab) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState({}, "", url.toString());
  }, []);

  function badgeFor(id: Tab): number {
    switch (id) {
      case "reception":
        return triageWaiting;
      case "appointments":
        return appointmentsToday;
      case "payments":
        return Math.min(cashierWaiting, 99);
      default:
        return 0;
    }
  }

  return (
    <div className="space-y-4">
      <nav
        className="sticky top-0 z-10 -mx-1 flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 px-1 pb-2"
        aria-label="Front desk"
      >
        {TABS.map((t) => {
          const badge = badgeFor(t.id);
          const emphasize =
            (t.id === "payments" || t.id === "reception") && badge > 0;
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
        />
      ) : null}
      {tab === "appointments" ? <AppointmentsPanel /> : null}
      {tab === "payments" ? (
        <CashierWorkspace
          embedded
          onInvoiceFullyPaid={() => onTab("payments")}
        />
      ) : null}
      {tab === "expenses" ? <ExpenseRecordPanel /> : null}
      {tab === "report" ? (
        <div className="space-y-6">
          <PaymentsReportPanel />
          <ExpensesReportPanel />
        </div>
      ) : null}
    </div>
  );
}
