"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OverlayPortal } from "@/components/shared/overlay-portal";
import { LoadingBlock } from "@/components/shared/state-blocks";
import { fetchHmisReport } from "@/features/reports/hmis";
import { loadClinicLogoDataUrl } from "@/lib/print/hiwet-brand";
import { buildHmisReportHtml, openPrintWindow } from "@/lib/print/hmis-report-html";

/** Ministry laboratory activity, printed with the clinic header, sidebar, and footer. */
export function PrintFullLabActivity() {
  const [open, setOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [from, setFrom] = useState(() =>
    new Date(new Date().setDate(1)).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const query = useQuery({
    queryKey: ["reports", "hmis", "lab-print", from, to],
    queryFn: () =>
      fetchHmisReport(
        new Date(from).toISOString(),
        new Date(`${to}T23:59:59`).toISOString(),
      ),
    enabled: open && Boolean(from && to),
  });

  async function print() {
    if (!query.data?.clinic) return;
    setPrinting(true);
    try {
      const logoUrl = await loadClinicLogoDataUrl();
      const html = buildHmisReportHtml({
        report: query.data,
        form: "lab",
        logoUrl,
      });
      openPrintWindow(html);
      setOpen(false);
    } finally {
      setPrinting(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Print full report
      </Button>
      {open ? (
        <OverlayPortal>
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close"
              onClick={() => setOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              className="relative w-full max-w-lg rounded-lg bg-white p-5 shadow-xl"
            >
              <h3 className="text-base font-semibold text-slate-900">
                Print laboratory report
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                Persons tested and the diagnostic activity table, with the clinic header, services list, and footer.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="mb-1 block text-xs">From</Label>
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="mb-1 block text-xs">To</Label>
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
              </div>
              {query.isLoading ? (
                <div className="mt-3">
                  <LoadingBlock label="Loading report data" />
                </div>
              ) : null}
              {query.isError ? (
                <p className="mt-3 text-xs text-red-700">
                  Could not load report data for this period.
                </p>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={!query.data?.clinic || query.isLoading || printing}
                  onClick={() => void print()}
                >
                  Print / PDF
                </Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </OverlayPortal>
      ) : null}
    </>
  );
}
