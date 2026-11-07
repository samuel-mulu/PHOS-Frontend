"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorState, WorkspacePageSkeleton } from "@/components/shared/state-blocks";
import { fetchDashboardStats } from "@/features/reports/dashboard";
import { fetchNotificationSummary } from "@/features/notifications/api";
import { useTranslation } from "@/i18n/context";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/format/money";

function StatCard({
  label,
  value,
  highlight,
  display,
  href,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  /** Formatted text instead of the raw number (e.g. money). */
  display?: string;
  href?: string;
}) {
  const card = (
    <Card
      className={cn(
        "p-4",
        highlight && value > 0 && "border-amber-300 bg-amber-50/50",
        href && "transition-colors hover:border-teal-400",
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
        {display ?? value}
      </p>
    </Card>
  );
  return href ? <Link href={href}>{card}</Link> : card;
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
    refetchInterval: 60_000,
  });

  if (stats.isLoading) {
    return <WorkspacePageSkeleton label="Loading dashboard" />;
  }
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
        <h1 className="text-xl font-semibold text-foreground">{t("dashboard.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("dashboard.subtitle")}</p>
        <p className="mt-1 text-xs text-muted">
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

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Owed by patients"
          value={s.outstandingCents ?? 0}
          display={formatCents(s.outstandingCents ?? 0)}
          highlight
          href="/reports?view=debts"
        />
        <StatCard label="Pay later today" value={s.deferredTodayCount ?? 0} />
        <StatCard
          label="Waived today"
          value={s.waivedTodayCents ?? 0}
          display={formatCents(s.waivedTodayCents ?? 0)}
        />
      </div>

      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">{t("dashboard.alerts")}</h2>
          <Link href="/notifications">
            <Button type="button" size="sm" variant="outline">
              {t("dashboard.openAlerts")}
            </Button>
          </Link>
        </div>
        {alerts.isLoading ? (
          <p className="text-sm text-muted">…</p>
        ) : alerts.data ? (
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-md bg-red-100 px-2 py-1 font-medium text-red-900">
              Critical {byP?.CRITICAL ?? 0}
            </span>
            <span className="rounded-md bg-amber-100 px-2 py-1 font-medium text-amber-900">
              High {byP?.HIGH ?? 0}
            </span>
            <span className="rounded-md bg-muted-bg px-2 py-1 font-medium text-foreground">
              Normal {byP?.NORMAL ?? 0}
            </span>
            <span className="text-muted">({alerts.data.total} total unread)</span>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
