import { format } from "date-fns";
import { z } from "zod";
import type { Consultation } from "@/features/consultations/api";
import type { EncounterDetail } from "@/features/encounters/api";
import { ageYears } from "@/lib/format/age";

export const referralSheetSchema = z.object({
  referTo: z.string().optional(),
  referralDate: z.string().optional(),
  healthProblemIdentification: z.string().optional(),
  physicalFinding: z.string().optional(),
  laboratoryTests: z.string().optional(),
  tentativeDx: z.string().optional(),
  actionTaken: z.string().optional(),
  reasonForReferral: z.string().optional(),
  referredBy: z.string().optional(),
  referredDate: z.string().optional(),
  feedback: z.string().optional(),
});

export type ReferralSheetFormValues = z.infer<typeof referralSheetSchema>;

export function parseReferralSheet(
  raw: unknown,
): ReferralSheetFormValues | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = referralSheetSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function formatSexLabel(sex: string) {
  const normalized = sex.replaceAll("_", " ").toLowerCase();
  if (normalized === "female") return "Female";
  if (normalized === "male") return "Male";
  return sex.replaceAll("_", " ");
}

export function buildReferralPrefill(input: {
  encounter: EncounterDetail;
  consultation: Consultation | null | undefined;
  laboratoryTests?: string;
}): ReferralSheetFormValues {
  const { encounter, consultation, laboratoryTests = "" } = input;
  const doctor = encounter.assignedDoctor;
  const referredBy = doctor
    ? `Dr. ${doctor.firstName} ${doctor.lastName}`
    : "";
  const today = format(new Date(), "yyyy-MM-dd");

  const healthParts = [
    consultation?.chiefComplaint?.trim(),
    consultation?.assessment?.trim(),
  ].filter(Boolean);

  return {
    referTo: "",
    referralDate: today,
    healthProblemIdentification: healthParts.join("\n"),
    physicalFinding: consultation?.physicalExam?.trim() ?? "",
    laboratoryTests,
    tentativeDx: consultation?.assessment?.trim() ?? "",
    actionTaken: [consultation?.plan, consultation?.notes]
      .map((s) => s?.trim())
      .filter(Boolean)
      .join("\n"),
    reasonForReferral: "",
    referredBy,
    referredDate: today,
    feedback: "",
  };
}

export function patientDisplayName(encounter: EncounterDetail) {
  const p = encounter.patient;
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ");
}

export function patientAgeSex(encounter: EncounterDetail) {
  const p = encounter.patient;
  return {
    age: ageYears(p.dateOfBirth),
    sex: formatSexLabel(p.sex),
  };
}
