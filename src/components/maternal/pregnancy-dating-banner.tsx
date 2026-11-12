"use client";

import { format } from "date-fns";
import {
  assessPregnancy,
  formatGestationalAge,
  formatPregnancyDate,
  type PregnancyDatingInput,
} from "@/lib/maternal/pregnancy-dating";

export function PregnancyDatingBanner({
  history,
  assessmentDate,
}: {
  history?: PregnancyDatingInput | null;
  assessmentDate?: string | null;
}) {
  const asOf = assessmentDate?.slice(0, 10) || format(new Date(), "yyyy-MM-dd");
  const dating = assessPregnancy(history, asOf);
  const eddLabel = dating.established ? formatPregnancyDate(dating.edd) : null;
  const asOfLabel = formatPregnancyDate(asOf);

  return (
    <section className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 dark:border-teal-900 dark:bg-teal-950/40">
      <p className="text-xs font-semibold uppercase tracking-wide text-teal-900 dark:text-teal-200">
        Gestational age
      </p>
      {dating.established && dating.ga ? (
        <p className="mt-1 text-2xl font-semibold text-emerald-700 dark:text-emerald-400">
          {formatGestationalAge(dating.ga)}
        </p>
      ) : (
        <p className="mt-1 text-lg font-semibold text-foreground">Not established</p>
      )}
      <p className="mt-1 text-sm text-foreground">
        EDD: {eddLabel ?? "Not established"}
        {dating.established && dating.sourceLabel
          ? ` · Dating source: ${dating.sourceLabel}`
          : ""}
      </p>
      <p className="mt-0.5 text-xs text-muted">
        {dating.note
          ? dating.note
          : dating.established
            ? `Calculated as of ${asOfLabel}`
            : history
              ? "EDD and gestational age are not established."
              : "Record LMP or a dating source on OB History."}
      </p>
    </section>
  );
}
