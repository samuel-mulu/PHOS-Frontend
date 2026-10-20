import type { ConsultationFormValues } from "@/features/consultations/schemas";
import type { ReferralSheetFormValues } from "@/features/consultations/referral-sheet";
import { CONSULTATION_FIELD_MEMORY_KEYS } from "@/lib/field-memory/keys";
import { useFieldMemoryStore } from "@/stores/field-memory-store";

export function rememberConsultationFields(
  userId: string | null | undefined,
  values: ConsultationFormValues,
) {
  if (!userId) return;
  const remember = useFieldMemoryStore.getState().remember;
  for (const key of CONSULTATION_FIELD_MEMORY_KEYS) {
    const text = values[key]?.trim();
    if (text) remember(userId, key, text);
  }
}

export function rememberLabClinicalNotes(
  userId: string | null | undefined,
  notes: string | undefined,
) {
  if (!userId) return;
  const text = notes?.trim();
  if (text) useFieldMemoryStore.getState().remember(userId, "lab.clinicalNotes", text);
}

const REFERRAL_MEMORY_MAP: Array<
  [keyof ReferralSheetFormValues, string]
> = [
  ["referTo", "referral.referTo"],
  ["healthProblemIdentification", "referral.healthProblemIdentification"],
  ["physicalFinding", "referral.physicalFinding"],
  ["laboratoryTests", "referral.laboratoryTests"],
  ["tentativeDx", "referral.tentativeDx"],
  ["actionTaken", "referral.actionTaken"],
  ["reasonForReferral", "referral.reasonForReferral"],
  ["referredBy", "referral.referredBy"],
  ["feedback", "referral.feedback"],
];

export function rememberReferralSheet(
  userId: string | null | undefined,
  sheet: ReferralSheetFormValues,
) {
  if (!userId) return;
  const remember = useFieldMemoryStore.getState().remember;
  for (const [field, key] of REFERRAL_MEMORY_MAP) {
    const text = sheet[field]?.trim();
    if (text) remember(userId, key, text);
  }
}
