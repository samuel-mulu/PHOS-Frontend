"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingBlock, ErrorState } from "@/components/shared/state-blocks";
import { fetchDashboardStats } from "@/features/reports/dashboard";
import { fetchNotificationSummary } from "@/features/notifications/api";
import { useTranslation } from "@/i18n/context";
import { cn } from "@/lib/utils";

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <Card
      className={cn(
        "p-4",
        highlight && value > 0 && "border-amber-300 bg-amber-50/50",
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
        {value}
      </p>
    </Card>
  );
}

export function OperationalDashboard() {
  const { t } = useTranslation();
  const stats = useQuery({
    queryKey: ["reports", "dashboard"],
    queryFn: fetchDashboardStats,
    refetchInterval: 60_000,
  });
  const alerts = useQuery({
    queryKey: ["notifications", "summary"],
    queryFn: fetchNotificationSummary,
    refetchInterval: 30_000,
  });

  if (stats.isLoading) return <LoadingBlock label="Loading dashboard" />;
  if (stats.isError || !stats.data) {
    return (
      <ErrorState
        message="Dashboard stats unavailable."
        onRetry={() => void stats.refetch()}
      />
    );
  }

  const s = stats.data;
  const byP = alerts.data?.byPriority;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{t("dashboard.title")}</h1>
        <p className="mt-1 text-sm text-slate-600">{t("dashboard.subtitle")}</p>
        <p className="mt-1 text-xs text-slate-400">
          Updated {format(new Date(s.asOf), "HH:mm:ss")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t("dashboard.patientsToday")} value={s.patientsRegisteredToday} />
        <StatCard label={t("dashboard.activeVisits")} value={s.activeEncounters} />
        <StatCard label={t("dashboard.withDoctor")} value={s.withDoctor} />
        <StatCard label={t("dashboard.waitingDoctor")} value={s.waitingDoctor} />
        <StatCard label={t("dashboard.inTriage")} value={s.inTriage} />
        <StatCard
          label={t("dashboard.waitingPayment")}
          value={s.waitingPayment}
          highlight
        />
        <StatCard label={t("dashboard.activeLab")} value={s.activeLabOrders} />
        <StatCard
          label={t("dashboard.pendingInvoices")}
          value={s.pendingInvoices}
          highlight
        />
        <StatCard label={t("dashboard.appointmentsToday")} value={s.appointmentsToday} />
      </div>

      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">{t("dashboard.alerts")}</h2>
          <Link href="/notifications">
            <Button type="button" size="sm" variant="outline">
              {t("dashboard.openAlerts")}
            </Button>
          </Link>
        </div>
        {alerts.isLoading ? (
          <p className="text-sm text-slate-500">…</p>
        ) : alerts.data ? (
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-md bg-red-100 px-2 py-1 font-medium text-red-900">
              Critical {byP?.CRITICAL ?? 0}
            </span>
            <span className="rounded-md bg-amber-100 px-2 py-1 font-medium text-amber-900">
              High {byP?.HIGH ?? 0}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-800">
              Normal {byP?.NORMAL ?? 0}
            </span>
            <span className="text-slate-500">({alerts.data.total} total unread)</span>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
