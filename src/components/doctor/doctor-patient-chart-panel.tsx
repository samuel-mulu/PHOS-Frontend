"use client";

import Link from "next/link";
import { format } from "date-fns";
import { LoadingBlock } from "@/components/shared/state-blocks";
import { usePatientChart } from "@/features/patients/hooks";
import { useTranslation } from "@/i18n/context";

export function DoctorPatientChartPanel({
  patientId,
  encounterId,
}: {
  patientId: string;
  encounterId: string;
}) {
  const { t } = useTranslation();
  const chart = usePatientChart(patientId);

  if (chart.isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <LoadingBlock label="Loading chart" />
      </div>
    );
  }
  if (!chart.data) return null;

  const visitLabs = chart.data.labOrders.filter(
    (o) => o.encounterId === encounterId,
  );
  const visitInvoices = chart.data.invoices.filter(
    (i) => i.encounterId === encounterId,
  );
  const recentLabs = chart.data.labOrders.slice(0, 5);
  const allergies = chart.data.patient.allergies;

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("doctor.chartTitle")}
        </h3>
        <Link
          href={`/patients/${patientId}`}
          className="text-xs font-medium text-teal-700 underline"
        >
          {t("doctor.viewFullChart")}
        </Link>
      </div>

      {allergies ? (
        <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-950">
          Allergies: {allergies}
        </p>
      ) : null}

      <section>
        <p className="text-xs font-medium text-slate-700">This visit — labs</p>
        {visitLabs.length === 0 ? (
          <p className="text-xs text-slate-500">None</p>
        ) : (
          <ul className="mt-1 space-y-0.5 text-xs text-slate-800">
            {visitLabs.map((o) => (
              <li key={o.id}>
                {o.orderNumber} — {o.status}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <p className="text-xs font-medium text-slate-700">This visit — billing</p>
        {visitInvoices.length === 0 ? (
          <p className="text-xs text-slate-500">No invoice</p>
        ) : (
          <ul className="mt-1 space-y-0.5 text-xs text-slate-800">
            {visitInvoices.map((inv) => (
              <li key={inv.id}>
                <Link href={`/billing/invoices/${inv.id}`} className="text-teal-700 underline">
                  {inv.invoiceNumber}
                </Link>{" "}
                — {inv.status}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <p className="text-xs font-medium text-slate-700">Recent labs (all visits)</p>
        {recentLabs.length === 0 ? (
          <p className="text-xs text-slate-500">None</p>
        ) : (
          <ul className="mt-1 max-h-24 space-y-0.5 overflow-y-auto text-xs text-slate-700">
            {recentLabs.map((o) => (
              <li key={o.id}>
                {format(new Date(o.createdAt), "dd MMM")} — {o.orderNumber} ({o.status})
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
