"use client";

import Link from "next/link";
import { useTranslation } from "@/i18n/context";

type Props = {
  variant: "doctor" | "desk";
  encounterNumber?: string;
  invoiceNumber?: string | null;
  invoiceStatus?: string | null;
};

export function PaymentBillingExplainer({
  variant,
  encounterNumber,
  invoiceNumber,
  invoiceStatus,
}: Props) {
  const { t } = useTranslation();

  if (variant === "doctor") {
    return (
      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-800">
        <p className="font-semibold text-slate-900">{t("billing.doctorTitle")}</p>
        <ul className="list-disc space-y-1 pl-5 text-slate-700">
          <li>{t("billing.doctorStep1")}</li>
          <li>{t("billing.doctorStep2")}</li>
          <li>{t("billing.doctorStep3")}</li>
        </ul>
        {encounterNumber ? (
          <p className="text-xs text-slate-500">
            {t("billing.visit")}: {encounterNumber}
          </p>
        ) : null}
        {invoiceNumber ? (
          <p className="text-xs text-slate-600">
            {t("billing.invoice")}: {invoiceNumber} ({invoiceStatus ?? "—"})
          </p>
        ) : (
          <p className="text-xs text-amber-800">{t("billing.noInvoiceYet")}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-teal-200 bg-teal-50/80 px-4 py-3 text-sm text-teal-950">
      <p className="font-semibold">{t("billing.deskTitle")}</p>
      <p className="text-teal-900">{t("billing.deskIntro")}</p>
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-teal-200">
            <th className="py-1 pr-2 font-medium">{t("billing.termRequest")}</th>
            <th className="py-1 font-medium">{t("billing.termInvoice")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-1 pr-2 align-top">{t("billing.requestMeaning")}</td>
            <td className="py-1 align-top">{t("billing.invoiceMeaning")}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-xs text-teal-800">
        {t("billing.deskFooter")}{" "}
        <Link href="/front-desk" className="underline">
          {t("nav.frontDesk")}
        </Link>
        .
      </p>
    </div>
  );
}
