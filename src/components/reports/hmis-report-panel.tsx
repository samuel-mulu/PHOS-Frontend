"use client";

import { useState, type ReactNode } from "react";
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
  labPmCell,
  labTotalCell,
  type HmisClinic,
  type HmisForm,
  type HmisMorbidityRow,
  type HmisReport,
  type HmisWeeklyRow,
} from "@/features/reports/hmis";
import { loadClinicLogoDataUrl } from "@/lib/print/hiwet-brand";
import { buildHmisReportHtml, openPrintWindow } from "@/lib/print/hmis-report-html";
import { cn } from "@/lib/utils";

const TABS: { id: HmisForm; label: string }[] = [
  { id: "lab", label: "Laboratory" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

function Dash({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted">—</span>;
  return <span className="tabular-nums">{value}</span>;
}

function MiniTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] border-collapse text-xs">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th
                key={`${header}-${index}`}
                className={cn(
                  "border border-border bg-muted-bg px-2 py-1.5 font-semibold text-foreground",
                  index === 0 ? "text-left" : "text-right",
                )}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="odd:bg-card even:bg-muted-bg/40">
              {row.map((cell, j) => (
                <td
                  key={`${i}-${j}`}
                  className={cn(
                    "border border-border px-2 py-1 text-foreground",
                    j === 0 ? "text-left" : "text-right",
                  )}
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

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function WeeklyTable({ rows }: { rows: HmisWeeklyRow[] }) {
  return (
    <MiniTable
      headers={["Indicator", "Cases", "Deaths"]}
      rows={rows.map((row) => [
        row.indicator,
        <Dash key="c" value={row.cases} />,
        <Dash key="d" value={row.deaths} />,
      ])}
    />
  );
}

function CountTable({ rows }: { rows: Array<[string, number | null]> }) {
  return (
    <MiniTable
      headers={["Indicator", "Count"]}
      rows={rows.map(([label, value]) => [label, <Dash key={label} value={value} />])}
    />
  );
}

function LabView({ clinic }: { clinic: HmisClinic }) {
  const breakdown = clinic.labOtherBreakdown.filter((part) => part.count > 0);
  return (
    <div className="space-y-6">
      <Block title="Persons who had a laboratory test">
        <MiniTable
          headers={["", "Male", "Female", "Total"]}
          rows={[
            [
              "Outpatient",
              clinic.labPersons.op.M,
              clinic.labPersons.op.F,
              clinic.labPersons.op.total,
            ],
            [
              "Inpatient",
              clinic.labPersons.ip.M,
              clinic.labPersons.ip.F,
              clinic.labPersons.ip.total,
            ],
          ]}
        />
        <p className="text-2xs text-muted">
          Each person is counted once, even when several tests were done. Visits in the period: outpatient {clinic.opd.total} (male {clinic.opd.M}, female {clinic.opd.F}).
        </p>
      </Block>
      <Block title="Diagnostic activities">
        <MiniTable
          headers={["Test", "OP -ve", "OP +ve", "OP total", "IP -ve", "IP +ve", "IP total"]}
          rows={clinic.labTests.map((row) => [
            row.test,
            <Dash key="on" value={labPmCell(row, "op", "neg")} />,
            <Dash key="op" value={labPmCell(row, "op", "pos")} />,
            <Dash key="ot" value={labTotalCell(row, "op")} />,
            <Dash key="in" value={labPmCell(row, "ip", "neg")} />,
            <Dash key="ip" value={labPmCell(row, "ip", "pos")} />,
            <Dash key="it" value={labTotalCell(row, "ip")} />,
          ])}
        />
        <p className="text-2xs text-muted">
          A dash means the test has no positive or negative result. Those counts sit on the Others row.
        </p>
        {breakdown.length ? (
          <p className="text-2xs text-muted">
            Included under Others:{" "}
            {breakdown.map((part) => `${part.test} ${part.count}`).join(" · ")}
          </p>
        ) : null}
      </Block>
    </div>
  );
}

function WeeklyView({ clinic }: { clinic: HmisClinic }) {
  return (
    <div className="space-y-6">
      <Block title="Weekly surveillance">
        <WeeklyTable rows={clinic.weekly} />
        <p className="text-2xs text-muted">
          Deaths are not stored, so the deaths column stays blank. Malaria examined and parasite species come from verified blood film and RDT results.
        </p>
      </Block>
      <Block title="Immediately reportable">
        <WeeklyTable rows={clinic.immediate} />
      </Block>
    </div>
  );
}

function MorbidityTable({
  rows,
  ageGroups,
}: {
  rows: HmisMorbidityRow[];
  ageGroups: HmisClinic["ageGroups"];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[64rem] border-collapse text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 border border-border bg-muted-bg px-2 py-1.5 text-left font-semibold">
              Diagnosis
            </th>
            {ageGroups.flatMap((band) => [
              <th key={`${band}-m`} className="border border-border bg-muted-bg px-2 py-1.5 text-right font-semibold">
                {band} M
              </th>,
              <th key={`${band}-f`} className="border border-border bg-muted-bg px-2 py-1.5 text-right font-semibold">
                {band} F
              </th>,
            ])}
            <th className="border border-border bg-muted-bg px-2 py-1.5 text-right font-semibold">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td className="sticky left-0 border border-border bg-card px-2 py-1">
                {row.name}
              </td>
              {ageGroups.flatMap((band) => [
                <td key={`${row.name}-${band}-m`} className="border border-border px-2 py-1 text-right tabular-nums">
                  {row.bands[band].M}
                </td>,
                <td key={`${row.name}-${band}-f`} className="border border-border px-2 py-1 text-right tabular-nums">
                  {row.bands[band].F}
                </td>,
              ])}
              <td className="border border-border px-2 py-1 text-right font-semibold tabular-nums">
                {row.total}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MonthlyView({ clinic }: { clinic: HmisClinic }) {
  const [showAll, setShowAll] = useState(false);
  const fp = clinic.familyPlanning;
  const anc = clinic.anc;
  const morbidity = showAll
    ? clinic.morbidities
    : clinic.morbidities.filter((row) => row.total > 0);
  return (
    <div className="space-y-6">
      <Block title="Outpatient visits by age">
        <MiniTable
          headers={["Age", "Male", "Female", "Total"]}
          rows={Object.entries(clinic.opdByAge).map(([band, pair]) => [
            band,
            pair.M,
            pair.F,
            pair.M + pair.F,
          ])}
        />
      </Block>
      <Block title="Family planning">
        <MiniTable
          headers={["Age", "New", "Repeat"]}
          rows={Object.keys(fp.newByAge).map((key) => [
            key,
            fp.newByAge[key] ?? 0,
            fp.repeatByAge[key] ?? 0,
          ])}
        />
        <MiniTable
          headers={["Method", "New", "Repeat"]}
          rows={Object.keys(fp.newByMethod).map((key) => [
            key,
            fp.newByMethod[key] ?? 0,
            fp.repeatByMethod[key] ?? 0,
          ])}
        />
        {fp.untypedVisit > 0 ? (
          <p className="text-2xs text-muted">
            {fp.untypedVisit} visits have no visit type and are counted as repeat.
          </p>
        ) : null}
      </Block>
      <Block title="Antenatal and postnatal care">
        <CountTable
          rows={[
            ["First visit, under 16 weeks", anc.firstUnder16],
            ["First visit, 16 weeks or more", anc.firstAtLeast16],
            ["First visit, gestational age not recorded", anc.firstGaUnknown],
            ...Object.keys(anc.firstByAge).map(
              (key) => [`First visit, ${key}`, anc.firstByAge[key] ?? 0] as [string, number],
            ),
            ["Fourth visit or later", anc.fourthVisit],
            ...Object.keys(anc.fourthByAge).map(
              (key) => [`Fourth visit, ${key}`, anc.fourthByAge[key] ?? 0] as [string, number],
            ),
            ["Syphilis tested", anc.syphilisTested],
            ["Syphilis reactive", anc.syphilisReactive],
            ["Syphilis treated", anc.syphilisTreated],
            ["Hepatitis B or C tested", anc.hepaTested],
            ["Hepatitis reactive", anc.hepaReactive],
            ["Hepatitis treated", anc.hepaTreated],
            ["Postnatal visits", anc.pncVisits],
          ]}
        />
      </Block>
      <Block title="Delivery">
        <CountTable
          rows={[
            ["Births attended at the clinic", clinic.delivery.skilledBirths],
            ["Caesarean section", clinic.delivery.caesarean],
            ["Stillbirths", clinic.delivery.stillbirths],
            ["Live births", clinic.delivery.liveBirths],
            ["Low birth weight (under 2500 g)", clinic.delivery.lowBirthWeight],
            ["Live births weighed", clinic.delivery.weighed],
          ]}
        />
      </Block>
      <Block title="Malaria and HIV testing">
        <CountTable
          rows={[
            ["Slides or RDT performed", clinic.malaria.examined],
            ["Positive Pf", clinic.malaria.pf],
            ["Positive Pv", clinic.malaria.pv],
            ["Positive, species not stated", clinic.malaria.unspecified],
            ["HIV tested", clinic.hiv.testedGeneral],
            ["HIV positive", clinic.hiv.positiveGeneral],
            ["HIV tested in pregnancy, labour, or postnatal care", clinic.hiv.testedPregnant],
            ["HIV positive in that group", clinic.hiv.positivePregnant],
            ["New ART", clinic.hiv.artNew],
          ]}
        />
      </Block>
      <Block title="Outpatient morbidity">
        <div className="flex items-center justify-between gap-3">
          <p className="text-2xs text-muted">
            {showAll
              ? "Full NCoD list, including rows with no cases."
              : "Diagnoses with at least one case. Unmatched diagnoses are in Other."}
          </p>
          <Button type="button" variant="outline" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show cases only" : "Show full list"}
          </Button>
        </div>
        {morbidity.length === 0 ? (
          <p className="text-sm text-muted">No diagnoses in this period.</p>
        ) : (
          <MorbidityTable rows={morbidity} ageGroups={clinic.ageGroups} />
        )}
      </Block>
      <Block title="Not recorded in this clinic system">
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
          {clinic.notRecorded.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Block>
    </div>
  );
}

export function HmisReportPanel({ full = false }: { full?: boolean }) {
  const [from, setFrom] = useState(() =>
    new Date(new Date().setDate(1)).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [tab, setTab] = useState<HmisForm>(full ? "monthly" : "lab");
  const [printing, setPrinting] = useState(false);

  const query = useQuery({
    queryKey: ["reports", "hmis", from, to],
    queryFn: () =>
      fetchHmisReport(
        new Date(from).toISOString(),
        new Date(`${to}T23:59:59`).toISOString(),
      ),
    enabled: Boolean(from && to),
  });

  const report: HmisReport | undefined = query.data;

  function exportCsv() {
    if (!query.data) return;
    downloadBlob(hmisToCsv(query.data), `hmis-${from}-to-${to}.csv`, "text/csv;charset=utf-8");
  }

  async function printForm() {
    if (!query.data?.clinic) return;
    setPrinting(true);
    try {
      const logoUrl = await loadClinicLogoDataUrl();
      const html = buildHmisReportHtml({ report: query.data, form: tab, logoUrl });
      openPrintWindow(html);
    } finally {
      setPrinting(false);
    }
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Ministry report">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold",
                  tab === item.id
                    ? "border-teal-700 bg-teal-700 text-white"
                    : "border-border bg-card text-foreground hover:border-teal-400",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">
            Counts for the selected dates. Print uses the clinic header, services list, and footer.
            The monthly form prints wide, without the side list, so the age columns fit.
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
              <Button type="button" onClick={() => void downloadHmisXlsx(report, from, to)}>
                Export Excel
              </Button>
              <Button type="button" variant="outline" onClick={exportCsv}>
                Export CSV
              </Button>
              <Button type="button" variant="secondary" disabled={printing} onClick={() => void printForm()}>
                {printing ? "Preparing…" : "Print / PDF"}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {query.isLoading ? <LoadingBlock label="Loading HMIS data" /> : null}
      {query.isError ? (
        <ErrorState message="HMIS report unavailable." onRetry={() => void query.refetch()} />
      ) : null}

      {report?.clinic ? (
        <>
          <p className="text-sm text-foreground">
            {report.facility} · {format(new Date(report.period.from), "dd MMM yyyy")} –{" "}
            {format(new Date(report.period.to), "dd MMM yyyy")}
          </p>
          {tab === "lab" ? <LabView clinic={report.clinic} /> : null}
          {tab === "weekly" ? <WeeklyView clinic={report.clinic} /> : null}
          {tab === "monthly" ? <MonthlyView clinic={report.clinic} /> : null}
          {report.clinic.notes.length ? (
            <ul className="list-disc space-y-1 pl-5 text-2xs text-muted">
              {report.clinic.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : report ? (
        <p className="text-sm text-amber-800">
          Clinic tables are missing from this response. Refresh after the API restarts.
        </p>
      ) : null}
    </Card>
  );
}
