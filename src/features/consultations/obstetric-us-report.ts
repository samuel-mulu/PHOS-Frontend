import { z } from "zod";

export const obstetricUsReportSchema = z.object({
  patientName: z.string(),
  age: z.string(),
  cardNo: z.string(),
  date: z.string(),
  numberOfFetus: z.string(),
  viabilityFhb: z.string(),
  fetalPresentation: z.string(),
  gsCrlBpdFlAga: z.string(),
  amnioticFluidVolume: z.string(),
  placentalPositionGrade: z.string(),
  estimatedFetalWeight: z.string(),
  grossAnomaly: z.string(),
  index: z.string(),
  recommendation: z.string(),
  doctorName: z.string(),
});

export type ObstetricUsReportFormValues = z.infer<typeof obstetricUsReportSchema>;

const REPORT_KEYS = [
  "patientName",
  "age",
  "cardNo",
  "date",
  "numberOfFetus",
  "viabilityFhb",
  "fetalPresentation",
  "gsCrlBpdFlAga",
  "amnioticFluidVolume",
  "placentalPositionGrade",
  "estimatedFetalWeight",
  "grossAnomaly",
  "index",
  "recommendation",
  "doctorName",
] as const satisfies ReadonlyArray<keyof ObstetricUsReportFormValues>;

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function parseObstetricUsReport(
  raw: unknown,
): ObstetricUsReportFormValues | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  if (!REPORT_KEYS.some((key) => key in row)) return null;
  const sheet = Object.fromEntries(
    REPORT_KEYS.map((key) => [key, asText(row[key])]),
  ) as ObstetricUsReportFormValues;
  const parsed = obstetricUsReportSchema.safeParse(sheet);
  return parsed.success ? parsed.data : null;
}
