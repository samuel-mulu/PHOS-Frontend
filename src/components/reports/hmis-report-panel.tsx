"use client";

import { useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { LoadingBlock, ErrorState } from "@/components/shared/state-blocks";
import {
  downloadBlob,
  downloadHmisXlsx,
  fetchHmisReport,
  hmisToCsv,
  type HmisClinic,
  type HmisReport,
} from "@/features/reports/hmis";

function MiniTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<Array<string | number>>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] border-collapse text-xs">
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="border border-slate-200 bg-slate-50 px-2 py-1.5 text-left font-semibold text-slate-700"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={`${i}-${j}`}
                  className="border border-slate-200 px-2 py-1 tabular-nums text-slate-800"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

function ClinicTables({
  clinic,
  full,
}: {
  clinic: HmisClinic;
  full: boolean;
}) {
  const d = clinic.diseases;
  return (
    <div className="space-y-6">
      <Section title="Outpatient visits (by sex)">
        <MiniTable
          headers={["", "Male", "Female", "Total"]}
          rows={[
            ["OPD", clinic.opd.M, clinic.opd.F, clinic.opd.total],
            ["IPD", clinic.ipd.M, clinic.ipd.F, clinic.ipd.total],
          ]}
        />
      </Section>

      <Section title="Laboratory diagnostic activity">
        <MiniTable
          headers={[
            "Test",
            "OP -ve",
            "OP +ve",
            "OP Total",
            "IP -ve",
            "IP +ve",
            "IP Total",
          ]}
          rows={clinic.labTests.map((row) => [
            row.test,
            row.op_neg,
            row.op_pos,
            row.op_neg + row.op_pos,
            row.ip_neg,
            row.ip_pos,
            row.ip_neg + row.ip_pos,
          ])}
        />
      </Section>

      <Section title="Disease surveillance (cases)">
        <MiniTable
          headers={["Disease", "Cases"]}
          rows={[
            ["Malaria (Pf)", d.malariaPF],
            ["Malaria (Pv)", d.malariaPV],
            ["Meningitis", d.meningitis],
            ["Dysentery", d.dysentery],
            ["Typhoid fever", d.typhoid],
            ["Relapsing fever", d.relapsingFever],
            ["Epidemic typhus", d.epidemicTyphus],
            ["Scabies", d.scabies],
            ["SAM <5y", d.samUnder5],
          ]}
        />
        <p className="text-[11px] text-slate-500">Deaths are not recorded - 0.</p>
      </Section>

      <Section title="HIV testing">
        <MiniTable
          headers={["Population", "Tested", "Positive"]}
          rows={[
            ["General (VCT/PITC)", clinic.hiv.testedGeneral, clinic.hiv.positiveGeneral],
            [
              "Pregnant (MCH/PNC visit + HIV test)",
              clinic.hiv.testedPregnant,
              clinic.hiv.positivePregnant,
            ],
            ["New ART enrollments", clinic.hiv.artNew, "-"],
          ]}
        />
      </Section>

      {full ? (
        <>
          <Section title="Family planning (FP service visits)">
            <MiniTable
              headers={["Age group", "Number"]}
              rows={Object.entries(clinic.familyPlanning.newAcceptors).map(
                ([k, v]) => [k === "total" ? "Total" : k, v],
              )}
            />
            <p className="text-[11px] text-slate-500">
              Method mix is not captured yet - leave blank on the paper HMIS.
            </p>
          </Section>
          <Section title="Antenatal / MCH">
            <MiniTable
              headers={["Indicator", "Count"]}
              rows={[
                ["MCH visits (ANC 1st proxy)", clinic.anc.firstVisit],
                ["ANC 4th+ visit", clinic.anc.fourthVisit],
                ["PNC visits", clinic.anc.pncVisits],
                ["Syphilis tested (VDRL)", clinic.anc.syphilisTested],
                ["Syphilis reactive", clinic.anc.syphilisReactive],
                ["Syphilis treated", clinic.anc.syphilisTreated],
                ["Hepatitis B/C tested", clinic.anc.hepaTested],
                ["Hepatitis reactive", clinic.anc.hepaReactive],
              ]}
            />
          </Section>
          <Section title="EPI (under 1 year)">
            <p className="text-sm text-slate-500">
              Immunization doses are not in PHOS yet - all zeros.
            </p>
          </Section>
        </>
      ) : null}

      <Section title="Top morbidities by age / sex">
        {clinic.topMorbidities.length === 0 ? (
          <p className="text-sm text-slate-500">
            No finalized diagnoses in this period.
          </p>
        ) : (
          <MiniTable
            headers={[
              "Diagnosis",
              ...clinic.ageGroups.flatMap((ag) => [`${ag} M`, `${ag} F`]),
            ]}
            rows={clinic.topMorbidities.map((m) => [
              m.name,
              ...clinic.ageGroups.flatMap((ag) => [
                m.bands[ag].M,
                m.bands[ag].F,
              ]),
            ])}
          />
        )}
      </Section>
    </div>
  );
}

export function HmisReportPanel({ full = false }: { full?: boolean }) {
  const [from, setFrom] = useState(() =>
    new Date(new Date().setDate(1)).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const printRef = useRef<HTMLDivElement>(null);

  const query = useQuery({
    queryKey: ["reports", "hmis", from, to],
    queryFn: () =>
      fetchHmisReport(
        new Date(from).toISOString(),
        new Date(`${to}T23:59:59`).toISOString(),
      ),
    enabled: Boolean(from && to),
  });

  function exportCsv() {
    if (!query.data) return;
    const csv = hmisToCsv(query.data);
    downloadBlob(csv, `hmis-${from}-to-${to}.csv`, "text/csv;charset=utf-8");
  }

  function exportExcel() {
    if (!query.data) return;
    void downloadHmisXlsx(query.data, from, to);
  }

  function exportPdf() {
    if (!printRef.current) return;
    const html = printRef.current.innerHTML;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<!DOCTYPE html><html><head><title>HMIS</title><style>
        body{font-family:system-ui,sans-serif;padding:24px;font-size:12px}
        table{border-collapse:collapse;width:100%;margin:8px 0 20px}
        th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}
        th{background:#f4f4f4}
        h2,h3{margin:16px 0 6px}
      </style></head><body>${html}</body></html>`,
    );
    w.document.close();
    w.focus();
    w.print();
  }

  const report: HmisReport | undefined = query.data;

  return (
    <Card className="space-y-4 p-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">
          HMIS Automatic Clinic Report (Live Data)
        </h2>
        <p className="text-xs text-slate-600">
          Real aggregations from doctor diagnoses and verified lab results →
          Excel / PDF
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="hmis-from">From</Label>
          <Input
            id="hmis-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="hmis-to">To</Label>
          <Input
            id="hmis-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <Button type="button" variant="outline" onClick={() => void query.refetch()}>
          Refresh
        </Button>
        {report ? (
          <>
            <Button type="button" onClick={exportExcel}>
              Export Excel
            </Button>
            <Button type="button" variant="outline" onClick={exportCsv}>
              Export CSV
            </Button>
            <Button type="button" variant="secondary" onClick={exportPdf}>
              Print / PDF
            </Button>
          </>
        ) : null}
      </div>
      {query.isLoading ? <LoadingBlock label="Loading HMIS data" /> : null}
      {query.isError ? (
        <ErrorState
          message="HMIS report unavailable."
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {report ? (
        <>
          <div className="hidden" aria-hidden ref={printRef}>
            <h2>
              {report.facility} - HMIS {full ? "Full" : "Live"}
            </h2>
            <p>
              Period: {format(new Date(report.period.from), "dd MMM yyyy")} -{" "}
              {format(new Date(report.period.to), "dd MMM yyyy")}
            </p>
            {report.clinic ? (
              <ClinicTables clinic={report.clinic} full={full} />
            ) : null}
          </div>
          <p className="text-sm text-slate-700">
            {report.facility} ·{" "}
            {format(new Date(report.period.from), "dd MMM yyyy")} -{" "}
            {format(new Date(report.period.to), "dd MMM yyyy")}
          </p>
          {report.clinic ? (
            <ClinicTables clinic={report.clinic} full={full} />
          ) : (
            <p className="text-sm text-amber-800">
              Clinic tables are missing from this response. Refresh after the
              API restarts.
            </p>
          )}
          {report.clinic?.notes?.length ? (
            <ul className="list-disc space-y-1 pl-5 text-[11px] text-slate-500">
              {report.clinic.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}
