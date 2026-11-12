import { format } from "date-fns";

export const NAEGELE_DAYS = 280;

export type LmpStatus = "KNOWN" | "UNKNOWN";
export type DatingSource = "LMP" | "ULTRASOUND" | "CLINICAL" | "NONE";

export type PregnancyDatingInput = {
  lmpStatus?: LmpStatus | "" | null;
  datingSource?: DatingSource | "" | null;
  datingEstablished?: boolean | null;
  lmp?: string | null;
  edd?: string | null;
};

export type GestationalAge = {
  weeks: number;
  days: number;
};

export type PregnancyAssessment = {
  established: boolean;
  edd: string | null;
  ga: GestationalAge | null;
  sourceLabel: string | null;
  lmpStatus: LmpStatus | null;
  datingSource: DatingSource | null;
  note: string | null;
};

const SOURCE_LABEL: Record<DatingSource, string> = {
  LMP: "LMP",
  ULTRASOUND: "Ultrasound",
  CLINICAL: "Clinical",
  NONE: "No reliable dating",
};

function parseDay(value?: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function addCalendarDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function calendarDaysBetween(start: Date, end: Date): number {
  const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((utcEnd - utcStart) / 86_400_000);
}

function today(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function blank(
  lmpStatus: LmpStatus | null,
  datingSource: DatingSource | null,
  note: string | null = null,
): PregnancyAssessment {
  return {
    established: false,
    edd: null,
    ga: null,
    sourceLabel: datingSource ? SOURCE_LABEL[datingSource] : null,
    lmpStatus,
    datingSource,
    note,
  };
}

function fromAnchor(
  anchor: Date,
  edd: Date,
  asOf: Date,
  lmpStatus: LmpStatus,
  datingSource: DatingSource,
): PregnancyAssessment {
  const elapsed = calendarDaysBetween(anchor, asOf);
  if (elapsed < 0) {
    return {
      ...blank(lmpStatus, datingSource, "Assessment date is before the dating anchor."),
      edd: format(edd, "yyyy-MM-dd"),
    };
  }
  return {
    established: true,
    edd: format(edd, "yyyy-MM-dd"),
    ga: { weeks: Math.floor(elapsed / 7), days: elapsed % 7 },
    sourceLabel: SOURCE_LABEL[datingSource],
    lmpStatus,
    datingSource,
    note: null,
  };
}

export function assessPregnancy(
  input?: PregnancyDatingInput | null,
  assessmentDate?: string | null,
): PregnancyAssessment {
  const asOf = parseDay(assessmentDate) ?? today();
  if (!input) return blank(null, null);

  const status: LmpStatus | null =
    input.lmpStatus === "KNOWN" || input.lmpStatus === "UNKNOWN"
      ? input.lmpStatus
      : input.lmp
        ? "KNOWN"
        : null;
  const source: DatingSource | null =
    input.datingSource === "LMP" ||
    input.datingSource === "ULTRASOUND" ||
    input.datingSource === "CLINICAL" ||
    input.datingSource === "NONE"
      ? input.datingSource
      : status === "KNOWN"
        ? "LMP"
        : null;

  if (status === "KNOWN") {
    const lmp = parseDay(input.lmp);
    if (!lmp) return blank("KNOWN", "LMP", "Enter the LMP date.");
    return fromAnchor(lmp, addCalendarDays(lmp, NAEGELE_DAYS), asOf, "KNOWN", "LMP");
  }

  if (source === "ULTRASOUND") {
    const edd = parseDay(input.edd);
    if (!edd) return blank("UNKNOWN", "ULTRASOUND", "Enter the ultrasound EDD.");
    return fromAnchor(addCalendarDays(edd, -NAEGELE_DAYS), edd, asOf, "UNKNOWN", "ULTRASOUND");
  }

  if (source === "CLINICAL") {
    const edd = parseDay(input.edd);
    if (!edd || input.datingEstablished !== true) {
      return blank(
        "UNKNOWN",
        "CLINICAL",
        "Gestational age is calculated once clinical dating is sufficiently established.",
      );
    }
    return fromAnchor(addCalendarDays(edd, -NAEGELE_DAYS), edd, asOf, "UNKNOWN", "CLINICAL");
  }

  if (source === "NONE") {
    return blank(
      "UNKNOWN",
      "NONE",
      "No reliable dating. EDD and gestational age are not established.",
    );
  }

  if (status === "UNKNOWN") {
    return blank("UNKNOWN", null, "Select a dating source.");
  }

  return blank(null, null);
}

export function formatGestationalAge(ga: GestationalAge): string {
  const weekLabel = ga.weeks === 1 ? "week" : "weeks";
  const dayLabel = ga.days === 1 ? "day" : "days";
  return `${ga.weeks} ${weekLabel} + ${ga.days} ${dayLabel}`;
}

export function formatPregnancyDate(iso?: string | null): string | null {
  const date = parseDay(iso);
  if (!date) return null;
  return format(date, "dd/MM/yyyy");
}
