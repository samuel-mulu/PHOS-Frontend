"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { LoadingBlock } from "@/components/shared/state-blocks";
import {
  encounterStatusBadge,
  labOrderStatusBadge,
  StatusBadge,
} from "@/components/shared/status-badge";
import { formatAge } from "@/lib/format/age";
import { cn } from "@/lib/utils";
import { usePatientChart } from "@/features/patients/hooks";
import type {
  PatientChart,
  PatientChartEncounter,
  PatientChartPrescription,
} from "@/features/patients/api";
import type { LabOrder } from "@/features/laboratory/api";
import type { ClinicalMessage } from "@/features/clinical-messages/types";
import {
  ClinicalMessageAuthorSide,
  ClinicalMessageKind,
} from "@/features/clinical-messages/types";
import { LabOrderStatus } from "@/types/lab";
import { PrintHistoryVisitNotesDialog } from "@/components/print/print-history-visit-notes";
import { isUltrasoundDescription } from "@/lib/clinical/ultrasound";

type HistoryTab =
  | "visits"
  | "labs"
  | "notes"
  | "ultrasound"
  | "meds"
  | "maternal"
  | "fp";

type UltrasoundHistoryRecord = {
  encounter: PatientChartEncounter;
  planText: string | null;
  orderedLines: string[];
};

function buildUltrasoundRecords(chart: PatientChart): UltrasoundHistoryRecord[] {
  const rows: UltrasoundHistoryRecord[] = [];
  for (const enc of chart.encounters) {
    const planText = enc.consultation?.plan?.trim() || null;
    const invoice = chart.invoices.find((i) => i.encounterId === enc.id);
    const orderedLines = (invoice?.items ?? [])
      .filter((item) => isUltrasoundDescription(item.description))
      .map((item) => item.description);
    if (!planText && orderedLines.length === 0) continue;
    rows.push({ encounter: enc, planText, orderedLines });
  }
  return rows.sort((a, b) => {
    const vn =
      (a.encounter.visitNumber ?? 0) - (b.encounter.visitNumber ?? 0);
    if (vn !== 0) return vn;
    return (
      new Date(b.encounter.startedAt).getTime() -
      new Date(a.encounter.startedAt).getTime()
    );
  });
}

function doctorName(
  person?: { firstName: string; lastName: string } | null,
): string | null {
  if (!person) return null;
  return `Dr. ${person.firstName} ${person.lastName}`;
}

function formatFullDate(value: string) {
  return format(new Date(value), "dd MMM yyyy · HH:mm");
}

export function DoctorPatientChartPanel({
  patientId,
  encounterId,
  open: openProp,
  onOpenChange,
  compact = false,
}: {
  patientId: string;
  encounterId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When true, only render a small trigger + drawer (for header use). */
  compact?: boolean;
}) {
  const chart = usePatientChart(patientId);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = (next: boolean) => {
    onOpenChange?.(next);
    if (openProp === undefined) setInternalOpen(next);
  };

  if (chart.isLoading) {
    if (compact) {
      return (
        <Button type="button" size="sm" variant="outline" disabled>
          History…
        </Button>
      );
    }
    return (
      <div className="rounded-lg border border-border bg-card p-3">
        <LoadingBlock label="Loading history" />
      </div>
    );
  }
  if (!chart.data) return null;

  const { patient, encounters, labOrders, prescriptions } = chart.data;
  const pastVisits = encounters.filter((e) => e.id !== encounterId);
  const verifiedLabs = labOrders.filter(
    (o) => o.status === LabOrderStatus.VERIFIED,
  ).length;

  return (
    <>
      {compact ? (
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          View history
        </Button>
      ) : (
        <div className="space-y-3 rounded-lg border border-border bg-card p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                Patient history
              </h3>
              <p className="mt-0.5 text-2xs text-muted">
                Read-only past visits, labs &amp; medicines
              </p>
            </div>
            <StatusBadge label="View only" tone="slate" />
          </div>

          {patient.allergies ? (
            <p className="rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-950">
              Allergies: {patient.allergies}
            </p>
          ) : null}

          <dl className="grid grid-cols-3 gap-2 text-center">
            <StatMini label="Visits" value={encounters.length} />
            <StatMini label="Labs" value={verifiedLabs} />
            <StatMini label="Rx" value={prescriptions.length} />
          </dl>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-foreground">Recent visits</p>
            {pastVisits.length === 0 ? (
              <p className="text-xs text-muted">No earlier visits.</p>
            ) : (
              <ul className="max-h-36 space-y-1.5 overflow-y-auto text-xs">
                {pastVisits.slice(0, 4).map((enc) => {
                  const who =
                    doctorName(enc.consultation?.doctor) ??
                    doctorName(enc.assignedDoctor);
                  return (
                    <li
                      key={enc.id}
                      className="rounded-md border border-border px-2 py-1.5"
                    >
                      <p className="font-medium text-foreground">
                        {enc.visitNumber != null
                          ? `Visit ${enc.visitNumber} · `
                          : ""}
                        {formatFullDate(enc.startedAt)}
                      </p>
                      <p className="text-muted">
                        {enc.service?.name ?? enc.type}
                        {who ? ` · ${who}` : ""}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <Button
            type="button"
            size="sm"
            className="w-full"
            onClick={() => setOpen(true)}
          >
            Open full history
          </Button>
          <Link
            href={`/patients/${patientId}`}
            className="block text-center text-xs font-medium text-teal-700 underline"
          >
            Patient profile page
          </Link>
        </div>
      )}

      {open ? (
        <PatientHistoryDrawer
          chart={chart.data}
          currentEncounterId={encounterId}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function StatMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted-bg px-1 py-1.5">
      <p className="text-base font-semibold text-foreground">{value}</p>
      <p className="text-3xs uppercase tracking-wide text-muted">
        {label}
      </p>
    </div>
  );
}

function PatientHistoryDrawer({
  chart,
  currentEncounterId,
  onClose,
}: {
  chart: PatientChart;
  currentEncounterId: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<HistoryTab>("visits");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedVisitIds, setSelectedVisitIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [printOpen, setPrintOpen] = useState(false);

  const ultrasoundRecords = useMemo(
    () => buildUltrasoundRecords(chart),
    [chart],
  );

  const visitBundles = useMemo(() => {
    return chart.encounters.map((enc) => ({
      encounter: enc,
      labs: chart.labOrders.filter((o) => o.encounterId === enc.id),
      meds: chart.prescriptions.filter((p) => p.encounterId === enc.id),
      isCurrent: enc.id === currentEncounterId,
    }));
  }, [chart, currentEncounterId]);

  const age = formatAge(chart.patient.dateOfBirth);

  const selectedEncounters = chart.encounters.filter((e) =>
    selectedVisitIds.has(e.id),
  );

  function toggleVisitSelected(id: string, checked: boolean) {
    setSelectedVisitIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close history"
        onClick={onClose}
      />
      <aside
        className="relative z-10 flex h-full w-full max-w-2xl flex-col overflow-hidden bg-card shadow-xl sm:rounded-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-history-title"
      >
        <header className="border-b border-border px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-teal-700">
                Read-only history
              </p>
              <h2
                id="patient-history-title"
                className="text-lg font-semibold text-foreground"
              >
                {[
                  chart.patient.firstName,
                  chart.patient.middleName,
                  chart.patient.lastName,
                ]
                  .filter(Boolean)
                  .join(" ")}
              </h2>
              <p className="text-sm text-muted">
                {chart.patient.patientNumber}
                {age ? ` · ${age}` : ""}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
          {chart.patient.allergies ? (
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950">
              Allergies: {chart.patient.allergies}
            </p>
          ) : null}
          <nav
            className="mt-3 flex flex-nowrap gap-1.5 overflow-x-auto pb-1"
            aria-label="History sections"
          >
            {(
              [
                ["visits", `Visits (${chart.encounters.length})`],
                ["labs", `Lab records (${chart.labOrders.length})`],
                [
                  "notes",
                  `Clinical notes (${chart.clinicalMessages?.length ?? 0})`,
                ],
                ["ultrasound", `Ultrasound (${ultrasoundRecords.length})`],
                ["meds", `Medications (${chart.prescriptions.length})`],
                [
                  "maternal",
                  `Maternal (${(chart.maternal?.ancVisits?.length ?? 0) + (chart.maternal?.obstetricHistory ? 1 : 0)})`,
                ],
                [
                  "fp",
                  `FP (${chart.maternal?.familyPlanningRecords?.length ?? 0})`,
                ],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium",
                  tab === id
                    ? "bg-teal-800 text-white"
                    : "bg-muted-bg text-foreground hover:bg-muted-bg",
                )}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {tab === "visits" ? (
            <div className="space-y-3">
              {visitBundles.length === 0 ? (
                <Empty>No previous visits recorded.</Empty>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted-bg px-3 py-2">
                    <p className="text-xs text-muted">
                      Select visits, then print Hiwet-style visit notes.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      disabled={selectedVisitIds.size === 0}
                      onClick={() => setPrintOpen(true)}
                    >
                      Print selected ({selectedVisitIds.size})
                    </Button>
                  </div>
                  {visitBundles.map(({ encounter, labs, meds, isCurrent }) => (
                    <VisitHistoryCard
                      key={encounter.id}
                      encounter={encounter}
                      labs={labs}
                      meds={meds}
                      isCurrent={isCurrent}
                      expanded={expandedId === encounter.id}
                      onToggle={() =>
                        setExpandedId((id) =>
                          id === encounter.id ? null : encounter.id,
                        )
                      }
                      selectable
                      selected={selectedVisitIds.has(encounter.id)}
                      onSelectChange={(checked) =>
                        toggleVisitSelected(encounter.id, checked)
                      }
                    />
                  ))}
                </>
              )}
            </div>
          ) : null}

          {tab === "labs" ? (
            <div className="space-y-3">
              {chart.labOrders.length === 0 ? (
                <Empty>No laboratory records.</Empty>
              ) : (
                chart.labOrders.map((order) => (
                  <LabHistoryCard key={order.id} order={order} />
                ))
              )}
            </div>
          ) : null}

          {tab === "ultrasound" ? (
            <div className="space-y-3">
              {ultrasoundRecords.length === 0 ? (
                <Empty>No ultrasound notes or orders on record.</Empty>
              ) : (
                ultrasoundRecords.map((record) => (
                  <UltrasoundHistoryCard key={record.encounter.id} {...record} />
                ))
              )}
            </div>
          ) : null}

          {tab === "meds" ? (
            <div className="space-y-3">
              {chart.prescriptions.length === 0 ? (
                <Empty>No medications prescribed yet.</Empty>
              ) : (
                chart.prescriptions.map((rx) => (
                  <MedHistoryCard key={rx.id} rx={rx} />
                ))
              )}
            </div>
          ) : null}

          {tab === "notes" ? (
            <ClinicalNotesHistoryView
              messages={chart.clinicalMessages ?? []}
            />
          ) : null}

          {tab === "maternal" ? <MaternalHistoryView chart={chart} /> : null}

          {tab === "fp" ? <FamilyPlanningHistoryView chart={chart} /> : null}
        </div>
      </aside>

      {printOpen && selectedEncounters.length > 0 ? (
        <PrintHistoryVisitNotesDialog
          patient={chart.patient}
          encounters={selectedEncounters}
          onClose={() => setPrintOpen(false)}
        />
      ) : null}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

function ClinicalNotesHistoryView({
  messages,
}: {
  messages: ClinicalMessage[];
}) {
  if (messages.length === 0) {
    return <Empty>No doctor ↔ lab clinical notes on chart.</Empty>;
  }

  const grouped = new Map<string, ClinicalMessage[]>();
  for (const m of messages) {
    const key = m.encounterId;
    const list = grouped.get(key) ?? [];
    list.push(m);
    grouped.set(key, list);
  }

  return (
    <div className="space-y-4">
      {[...grouped.entries()].map(([encounterId, items]) => {
        const enc = items[0]?.encounter;
        return (
          <section
            key={encounterId}
            className="rounded-lg border border-border bg-card p-3 shadow-sm"
          >
            <SectionLabel>
              {enc
                ? `Visit ${enc.visitNumber ?? "—"} · ${enc.encounterNumber} · ${format(new Date(enc.startedAt), "dd MMM yyyy")}`
                : "Visit notes"}
            </SectionLabel>
            <div className="mt-2 space-y-2">
              {items.map((m) => {
                const fromLab =
                  m.authorSide === ClinicalMessageAuthorSide.LAB;
                const name = [m.author.firstName, m.author.lastName]
                  .filter(Boolean)
                  .join(" ");
                const kind =
                  m.kind === ClinicalMessageKind.LAB_ORDER
                    ? "Lab order"
                    : m.kind === ClinicalMessageKind.LAB_RESULT
                      ? "Lab result"
                      : "Note";
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "rounded-md px-2.5 py-2 text-xs",
                      fromLab
                        ? "bg-slate-100 text-slate-900"
                        : "bg-teal-50 text-teal-950",
                    )}
                  >
                    <p className="font-semibold">
                      {fromLab ? "Lab" : "Doctor"}
                      {name ? ` · ${name}` : ""} · {kind} ·{" "}
                      {format(new Date(m.createdAt), "dd MMM HH:mm")}
                      {m.labOrder?.orderNumber
                        ? ` · ${m.labOrder.orderNumber}`
                        : ""}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function yesNo(v?: boolean | null) {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "—";
}

function MaternalHistoryView({ chart }: { chart: PatientChart }) {
  const maternal = chart.maternal;
  const oh = maternal?.obstetricHistory;
  const visits = maternal?.ancVisits ?? [];

  if (!oh && visits.length === 0) {
    return <Empty>No maternal health records on chart.</Empty>;
  }

  return (
    <div className="space-y-3">
      {oh ? (
        <article className="rounded-lg border border-border bg-card p-3 shadow-sm">
          <SectionLabel>Obstetric history</SectionLabel>
          <ul className="mt-2 grid gap-1 text-xs text-foreground sm:grid-cols-2">
            <li>
              GTPAL: {oh.gravidity ?? "—"}-{oh.term ?? "—"}-{oh.preterm ?? "—"}-
              {oh.abortion ?? "—"}-{oh.living ?? "—"}
            </li>
            <li>LMP: {oh.lmp ? format(new Date(oh.lmp), "dd MMM yyyy") : "—"}</li>
            <li>EDD: {oh.edd ? format(new Date(oh.edd), "dd MMM yyyy") : "—"}</li>
            <li>Previous delivery: {oh.previousDelivery ?? "—"}</li>
            <li>Previous CS: {yesNo(oh.previousCs)}</li>
            <li>Previous PPH: {yesNo(oh.previousPph)}</li>
            <li>PET/eclampsia: {yesNo(oh.previousPetEclampsia)}</li>
            <li>Stillbirth: {yesNo(oh.stillbirth)}</li>
            {oh.bloodGroupRh ? <li>Blood group: {oh.bloodGroupRh}</li> : null}
            {oh.hivStatus ? <li>HIV: {oh.hivStatus}</li> : null}
          </ul>
        </article>
      ) : null}

      {visits.length === 0 ? (
        <Empty>No ANC visits on chart.</Empty>
      ) : (
        visits.map((v) => (
          <article
            key={v.id}
            className="rounded-lg border border-border bg-card p-3 shadow-sm"
          >
            <p className="font-semibold text-foreground">
              ANC visit {v.visitNumber}
              {v.visitDate
                ? ` · ${format(new Date(v.visitDate), "dd MMM yyyy")}`
                : ""}
            </p>
            <ul className="mt-2 grid gap-1 text-xs text-foreground sm:grid-cols-2">
              <li>
                GA:{" "}
                {v.gaWeeks != null
                  ? `${v.gaWeeks}w${v.gaDays != null ? `+${v.gaDays}d` : ""}`
                  : "—"}
              </li>
              <li>
                BP:{" "}
                {v.systolic != null
                  ? `${v.systolic}/${v.diastolic ?? "—"}`
                  : "—"}
              </li>
              <li>Weight: {v.weightKg ?? "—"}</li>
              <li>FHR: {v.fetalHeartRate ?? "—"}</li>
              <li>Risk: {v.riskAssessment ?? "—"}</li>
            </ul>
            {v.treatment ? (
              <ReadonlyBlock label="Treatment" value={v.treatment} />
            ) : null}
          </article>
        ))
      )}
    </div>
  );
}

function FamilyPlanningHistoryView({ chart }: { chart: PatientChart }) {
  const records = chart.maternal?.familyPlanningRecords ?? [];
  if (records.length === 0) {
    return <Empty>No family planning records on chart.</Empty>;
  }

  return (
    <div className="space-y-3">
      {records.map((r) => (
        <article
          key={r.id}
          className="rounded-lg border border-border bg-card p-3 shadow-sm"
        >
          <p className="font-semibold text-foreground">
            {r.visitType?.replaceAll("_", " ") ?? "FP visit"}
            {r.currentMethod
              ? ` · ${r.currentMethod.replaceAll("_", " ")}`
              : ""}
          </p>
          <ul className="mt-2 grid gap-1 text-xs text-foreground sm:grid-cols-2">
            <li>
              G/P/Living: {r.gravidity ?? "—"}/{r.parity ?? "—"}/
              {r.livingChildren ?? "—"}
            </li>
            <li>
              BP:{" "}
              {r.systolic != null ? `${r.systolic}/${r.diastolic ?? "—"}` : "—"}
            </li>
            <li>Previous method: {r.previousMethod?.replaceAll("_", " ") ?? "—"}</li>
            <li>Outcome: {r.outcome ?? "—"}</li>
            <li>Counseling: {yesNo(r.counselingDone)}</li>
            <li>
              Procedure:{" "}
              {r.procedureDate
                ? format(new Date(r.procedureDate), "dd MMM yyyy")
                : "—"}
            </li>
          </ul>
          {r.counselingNotes ? (
            <ReadonlyBlock label="Counseling notes" value={r.counselingNotes} />
          ) : null}
        </article>
      ))}
    </div>
  );
}

function VisitHistoryCard({
  encounter,
  labs,
  meds,
  isCurrent,
  expanded,
  onToggle,
  selectable,
  selected,
  onSelectChange,
}: {
  encounter: PatientChartEncounter;
  labs: LabOrder[];
  meds: PatientChartPrescription[];
  isCurrent: boolean;
  expanded: boolean;
  onToggle: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (checked: boolean) => void;
}) {
  const consult = encounter.consultation;
  const who =
    doctorName(consult?.doctor) ?? doctorName(encounter.assignedDoctor);

  return (
    <article
      className={cn(
        "rounded-lg border bg-card shadow-sm",
        isCurrent ? "border-teal-300 ring-1 ring-teal-100" : "border-border",
      )}
    >
      <div className="flex items-start gap-2 px-3 py-3">
        {selectable ? (
          <input
            type="checkbox"
            className="mt-1 shrink-0"
            checked={selected ?? false}
            aria-label={`Select visit ${encounter.visitNumber ?? ""}`}
            onChange={(e) => onSelectChange?.(e.target.checked)}
            onClick={(e) => e.stopPropagation()}
          />
        ) : null}
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
          onClick={onToggle}
          aria-expanded={expanded}
        >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {encounter.visitNumber != null ? (
              <span className="rounded-full bg-teal-700 px-2 py-0.5 text-2xs font-bold text-white">
                Visit {encounter.visitNumber}
              </span>
            ) : null}
            <p className="font-semibold text-foreground">
              {formatFullDate(encounter.startedAt)}
            </p>
            {encounterStatusBadge(encounter.status)}
            {isCurrent ? (
              <StatusBadge label="This visit" tone="teal" />
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted">
            {encounter.service?.name ?? encounter.type}
            {encounter.department?.name
              ? ` · ${encounter.department.name}`
              : ""}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {who ?? "Doctor not recorded"}
            {encounter.encounterNumber
              ? ` · ${encounter.encounterNumber}`
              : ""}
          </p>
        </div>
        <span className="shrink-0 text-xs font-medium text-teal-800">
          {expanded ? "Hide" : "Details"}
        </span>
        </button>
      </div>

      {expanded ? (
        <div className="space-y-3 border-t border-border px-3 py-3 text-sm">
          {encounter.reason ? (
            <ReadonlyBlock label="Visit reason">{encounter.reason}</ReadonlyBlock>
          ) : null}

          {encounter.triage ? (
            <section>
              <SectionLabel>Triage</SectionLabel>
              <ul className="mt-1 grid gap-1 text-xs text-foreground sm:grid-cols-2">
                {encounter.triage.temperature != null ? (
                  <li>Temp: {encounter.triage.temperature} °C</li>
                ) : null}
                {encounter.triage.systolic != null ? (
                  <li>
                    BP: {encounter.triage.systolic}/
                    {encounter.triage.diastolic}
                  </li>
                ) : null}
                {encounter.triage.heartRate != null ? (
                  <li>Pulse: {encounter.triage.heartRate}</li>
                ) : null}
                {encounter.triage.spo2 != null ? (
                  <li>SpO2: {encounter.triage.spo2}%</li>
                ) : null}
                {encounter.triage.bloodGlucoseMgDl != null ? (
                  <li>Glucose: {encounter.triage.bloodGlucoseMgDl} mg/dL</li>
                ) : null}
                {encounter.triage.notes ? (
                  <li className="sm:col-span-2">Notes: {encounter.triage.notes}</li>
                ) : null}
              </ul>
            </section>
          ) : null}

          {consult ? (
            <section className="space-y-2">
              <SectionLabel>
                Consultation
                {doctorName(consult.doctor)
                  ? ` · ${doctorName(consult.doctor)}`
                  : ""}
              </SectionLabel>
              {consult.diagnoses?.length ? (
                <ul className="flex flex-wrap gap-1.5">
                  {consult.diagnoses.map((d, i) => (
                    <StatusBadge
                      key={d.id ?? `${d.label}-${i}`}
                      label={`${d.isPrimary ? "★ " : ""}${d.label}`}
                      tone={d.isPrimary ? "teal" : "slate"}
                    />
                  ))}
                </ul>
              ) : null}
              <ReadonlyBlock label="Vitals" value={consult.physicalExam} />
              <ReadonlyBlock
                label="Medical notes / follow-up / recommendations"
                value={consult.notes}
              />
              <ReadonlyBlock label="Lab notes" value={consult.labNotes} />
              <ReadonlyBlock label="Diagnosis" value={consult.assessment} />
              <ReadonlyBlock label="Ultrasound" value={consult.plan} />
              <ReadonlyBlock
                label="Prescription (Rx)"
                value={consult.historyPresentIllness}
              />
            </section>
          ) : (
            <p className="text-xs text-muted">No consultation notes.</p>
          )}

          <section>
            <SectionLabel>Labs this visit ({labs.length})</SectionLabel>
            {labs.length === 0 ? (
              <p className="mt-1 text-xs text-muted">None</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {labs.map((o) => (
                  <li key={o.id}>
                    <LabHistoryCard order={o} compact />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <SectionLabel>Medications this visit ({meds.length})</SectionLabel>
            {meds.length === 0 ? (
              <p className="mt-1 text-xs text-muted">None</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {meds.map((rx) => (
                  <li key={rx.id}>
                    <MedHistoryCard rx={rx} compact />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </article>
  );
}

function UltrasoundHistoryCard({
  encounter,
  planText,
  orderedLines,
}: UltrasoundHistoryRecord) {
  const who =
    doctorName(encounter.consultation?.doctor) ??
    doctorName(encounter.assignedDoctor);

  return (
    <article className="rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {encounter.visitNumber != null ? (
          <span className="rounded-full bg-teal-700 px-2 py-0.5 text-2xs font-bold text-white">
            Visit {encounter.visitNumber}
          </span>
        ) : null}
        <p className="font-semibold text-foreground">
          {formatFullDate(encounter.startedAt)}
        </p>
        {encounterStatusBadge(encounter.status)}
      </div>
      <p className="mt-1 text-xs text-muted">
        {who ?? "Doctor not recorded"}
        {encounter.encounterNumber ? ` · ${encounter.encounterNumber}` : ""}
      </p>
      {orderedLines.length > 0 ? (
        <div className="mt-3">
          <SectionLabel>Ordered on invoice</SectionLabel>
          <ul className="mt-1 list-inside list-disc text-xs text-foreground">
            {orderedLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {planText ? (
        <ReadonlyBlock label="Ultrasound report / notes">{planText}</ReadonlyBlock>
      ) : (
        <p className="mt-2 text-xs text-muted">
          No ultrasound text in consultation notes for this visit.
        </p>
      )}
    </article>
  );
}

function LabHistoryCard({
  order,
  compact,
}: {
  order: LabOrder;
  compact?: boolean;
}) {
  const verified = order.status === LabOrderStatus.VERIFIED;
  return (
    <div
      className={cn(
        "rounded-md border border-border p-3",
        verified && "border-l-4 border-l-emerald-500",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">{order.orderNumber}</p>
          <p className="text-xs text-muted">
            {formatFullDate(order.createdAt)}
            {doctorName(order.doctor) ? ` · ${doctorName(order.doctor)}` : ""}
          </p>
        </div>
        {labOrderStatusBadge(order.status)}
      </div>
      <ul className={cn("mt-2 space-y-1 text-xs", !compact && "text-sm")}>
        {order.items?.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-baseline justify-between gap-2"
          >
            <span className="font-medium text-foreground">
              {item.labTest?.name ?? "Test"}
            </span>
            {verified && item.result?.value ? (
              <span className="text-foreground">
                {item.result.value}
                {item.result.unit ? ` ${item.result.unit}` : ""}
                {item.result.flag ? (
                  <span className="ml-1 text-amber-800">
                    ({item.result.flag})
                  </span>
                ) : null}
              </span>
            ) : verified ? (
              <span className="italic text-muted">Not added</span>
            ) : (
              <span className="text-muted">No result yet</span>
            )}
          </li>
        ))}
      </ul>
      {order.clinicalNotes ? (
        <p className="mt-2 text-2xs text-muted">
          Clinical notes: {order.clinicalNotes}
        </p>
      ) : null}
      {order.doctorReviewNotes ? (
        <p className="mt-1.5 rounded bg-emerald-50 px-2 py-1 text-2xs text-emerald-950">
          <span className="font-semibold">Lab notes: </span>
          {order.doctorReviewNotes}
        </p>
      ) : null}
    </div>
  );
}

function MedHistoryCard({
  rx,
  compact,
}: {
  rx: PatientChartPrescription;
  compact?: boolean;
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">
            {rx.prescriptionNumber ?? "Prescription"}
          </p>
          <p className="text-xs text-muted">
            {formatFullDate(rx.createdAt)}
            {doctorName(rx.doctor) ? ` · ${doctorName(rx.doctor)}` : ""}
          </p>
        </div>
        <StatusBadge
          label={rx.status.replaceAll("_", " ")}
          tone={rx.status === "ACTIVE" ? "teal" : "slate"}
        />
      </div>
      <ul className={cn("mt-2 space-y-1.5 text-xs", !compact && "text-sm")}>
        {rx.items.map((item, idx) => (
          <li key={`${rx.id}-${idx}`} className="text-foreground">
            <span className="font-medium">{item.medicine.name}</span>
            {item.medicine.strength ? ` ${item.medicine.strength}` : ""}
            {item.dose || item.frequency || item.duration ? (
              <span className="text-muted">
                {" - "}
                {[item.dose, item.route, item.frequency, item.duration]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            ) : null}
            <span className="text-muted"> · qty {item.quantity}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
      {children}
    </p>
  );
}

function ReadonlyBlock({
  label,
  value,
  children,
}: {
  label: string;
  value?: string | null;
  children?: React.ReactNode;
}) {
  const content = children ?? value;
  if (!content) return null;
  return (
    <div className="rounded-md bg-muted-bg px-2.5 py-2">
      <p className="text-3xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-0.5 whitespace-pre-wrap text-xs text-foreground">
        {content}
      </p>
    </div>
  );
}
