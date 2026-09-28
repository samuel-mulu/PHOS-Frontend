"use client";

import { useTranslation } from "@/i18n/context";

export function FrontDeskFlowGuide() {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50/80 px-4 py-3 text-sm text-teal-950">
      <p className="font-semibold">{t("desk.flowTitle")}</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-teal-900">
        <li>{t("desk.flow1")}</li>
        <li>{t("desk.flow2")}</li>
        <li>
          {t("desk.flow3")}{" "}
          <a href="/reconciliation" className="underline">
            cash session
          </a>
          .
        </li>
      </ol>
      <p className="mt-2 text-xs text-teal-800">{t("desk.flowFooter")}</p>
    </div>
  );
}
