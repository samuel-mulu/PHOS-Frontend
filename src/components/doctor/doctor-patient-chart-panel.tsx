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
import { cn } from "@/lib/utils";
import { usePatientChart } from "@/features/patients/hooks";
import type {
  PatientChart,
  PatientChartEncounter,
  PatientChartPrescription,
} from "@/features/patients/api";
import type { LabOrder } from "@/features/laboratory/api";
import { LabOrderStatus } from "@/types/lab";

type HistoryTab = "visits" | "labs" | "meds";

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
      <div className="rounded-lg border border-slate-200 bg-white p-3">
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
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen(true)}
        >
          View history
        </Button>
      ) : (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Patient history
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-500">
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
            <p className="text-xs font-medium text-slate-700">Recent visits</p>
            {pastVisits.length === 0 ? (
              <p className="text-xs text-slate-500">No earlier visits.</p>
            ) : (
              <ul className="max-h-36 space-y-1.5 overflow-y-auto text-xs">
                {pastVisits.slice(0, 4).map((enc) => {
                  const who =
                    doctorName(enc.consultation?.doctor) ??
                    doctorName(enc.assignedDoctor);
                  return (
                    <li
                      key={enc.id}
                      className="rounded-md border border-slate-100 px-2 py-1.5"
                    >
                      <p className="font-medium text-slate-800">
                        {formatFullDate(enc.startedAt)}
                      </p>
                      <p className="text-slate-600">
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
    <div className="rounded-md bg-slate-50 px-1 py-1.5">
      <p className="text-base font-semibold text-slate-900">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">
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

  const visitBundles = useMemo(() => {
    return chart.encounters.map((enc) => ({
      encounter: enc,
      labs: chart.labOrders.filter((o) => o.encounterId === enc.id),
      meds: chart.prescriptions.filter((p) => p.encounterId === enc.id),
      isCurrent: enc.id === currentEncounterId,
    }));
  }, [chart, currentEncounterId]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close history"
        onClick={onClose}
      />
      <aside
        className="relative z-10 flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-xl sm:rounded-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-history-title"
      >
        <header className="border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-teal-700">
                Read-only history
              </p>
              <h2
                id="patient-history-title"
                className="text-lg font-semibold text-slate-900"
              >
                {[
                  chart.patient.firstName,
                  chart.patient.middleName,
                  chart.patient.lastName,
                ]
                  .filter(Boolean)
                  .join(" ")}
              </h2>
              <p className="text-sm text-slate-600">
                {chart.patient.patientNumber}
                {chart.patient.dateOfBirth
                  ? ` · DOB ${format(new Date(chart.patient.dateOfBirth), "dd MMM yyyy")}`
                  : ""}
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
          <nav className="mt-3 flex flex-wrap gap-1.5" aria-label="History sections">
            {(
              [
                ["visits", `Visits (${chart.encounters.length})`],
                ["labs", `Lab records (${chart.labOrders.length})`],
                ["meds", `Medications (${chart.prescriptions.length})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium",
                  tab === id
                    ? "bg-teal-800 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200",
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
                visitBundles.map(({ encounter, labs, meds, isCurrent }) => (
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
                  />
                ))
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
        </div>
      </aside>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

function VisitHistoryCard({
  encounter,
  labs,
  meds,
  isCurrent,
  expanded,
  onToggle,
}: {
  encounter: PatientChartEncounter;
  labs: LabOrder[];
  meds: PatientChartPrescription[];
  isCurrent: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const consult = encounter.consultation;
  const who =
    doctorName(consult?.doctor) ?? doctorName(encounter.assignedDoctor);

  return (
    <article
      className={cn(
        "rounded-lg border bg-white shadow-sm",
        isCurrent ? "border-teal-300 ring-1 ring-teal-100" : "border-slate-200",
      )}
    >
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900">
              {formatFullDate(encounter.startedAt)}
            </p>
            {encounterStatusBadge(encounter.status)}
            {isCurrent ? (
              <StatusBadge label="This visit" tone="teal" />
            ) : null}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {encounter.service?.name ?? encounter.type}
            {encounter.department?.name
              ? ` · ${encounter.department.name}`
              : ""}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
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

      {expanded ? (
        <div className="space-y-3 border-t border-slate-100 px-3 py-3 text-sm">
          {encounter.reason ? (
            <ReadonlyBlock label="Visit reason">{encounter.reason}</ReadonlyBlock>
          ) : null}

          {encounter.triage ? (
            <section>
              <SectionLabel>Triage</SectionLabel>
              <ul className="mt-1 grid gap-1 text-xs text-slate-700 sm:grid-cols-2">
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
              <ReadonlyBlock
                label="Chief complaint"
                value={consult.chiefComplaint}
              />
              <ReadonlyBlock label="HPI" value={consult.historyPresentIllness} />
              <ReadonlyBlock label="Exam" value={consult.physicalExam} />
              <ReadonlyBlock label="Assessment" value={consult.assessment} />
              <ReadonlyBlock label="Plan" value={consult.plan} />
              <ReadonlyBlock label="Notes" value={consult.notes} />
            </section>
          ) : (
            <p className="text-xs text-slate-500">No consultation notes.</p>
          )}

          <section>
            <SectionLabel>Labs this visit ({labs.length})</SectionLabel>
            {labs.length === 0 ? (
              <p className="mt-1 text-xs text-slate-500">None</p>
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
              <p className="mt-1 text-xs text-slate-500">None</p>
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
        "rounded-md border border-slate-200 p-3",
        verified && "border-l-4 border-l-emerald-500",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-slate-900">{order.orderNumber}</p>
          <p className="text-xs text-slate-500">
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
            <span className="font-medium text-slate-800">
              {item.labTest?.name ?? "Test"}
            </span>
            {verified && item.result?.value ? (
              <span className="text-slate-900">
                {item.result.value}
                {item.result.unit ? ` ${item.result.unit}` : ""}
                {item.result.flag ? (
                  <span className="ml-1 text-amber-800">
                    ({item.result.flag})
                  </span>
                ) : null}
              </span>
            ) : (
              <span className="text-slate-400">No result yet</span>
            )}
          </li>
        ))}
      </ul>
      {order.clinicalNotes ? (
        <p className="mt-2 text-[11px] text-slate-500">
          Clinical notes: {order.clinicalNotes}
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
    <div className="rounded-md border border-slate-200 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-slate-900">
            {rx.prescriptionNumber ?? "Prescription"}
          </p>
          <p className="text-xs text-slate-500">
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
          <li key={`${rx.id}-${idx}`} className="text-slate-800">
            <span className="font-medium">{item.medicine.name}</span>
            {item.medicine.strength ? ` ${item.medicine.strength}` : ""}
            {item.dose || item.frequency || item.duration ? (
              <span className="text-slate-600">
                {" — "}
                {[item.dose, item.route, item.frequency, item.duration]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            ) : null}
            <span className="text-slate-500"> · qty {item.quantity}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
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
    <div className="rounded-md bg-slate-50 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 whitespace-pre-wrap text-xs text-slate-800">
        {content}
      </p>
    </div>
  );
}
