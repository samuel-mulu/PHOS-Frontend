/** Keys for per-doctor phrase memory (localStorage). */
export type ConsultationFieldMemoryKey =
  | "physicalExam"
  | "notes"
  | "assessment"
  | "plan"
  | "historyPresentIllness";

export type FieldMemoryKey =
  | ConsultationFieldMemoryKey
  | "lab.clinicalNotes"
  | "referral.referTo"
  | "referral.healthProblemIdentification"
  | "referral.physicalFinding"
  | "referral.laboratoryTests"
  | "referral.tentativeDx"
  | "referral.actionTaken"
  | "referral.reasonForReferral"
  | "referral.referredBy"
  | "referral.feedback";

export const CONSULTATION_FIELD_MEMORY_KEYS: ConsultationFieldMemoryKey[] = [
  "physicalExam",
  "notes",
  "assessment",
  "plan",
  "historyPresentIllness",
];
