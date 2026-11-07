/** Keys for per-doctor phrase memory (localStorage). */
export type ConsultationFieldMemoryKey =
  | "physicalExam"
  | "notes"
  | "labNotes"
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
  | "referral.feedback"
  | "certificate.diagnosis"
  | "certificate.recommendations"
  | "obstetricUs.index"
  | "obstetricUs.recommendation";

export const CONSULTATION_FIELD_MEMORY_KEYS: ConsultationFieldMemoryKey[] = [
  "physicalExam",
  "notes",
  "labNotes",
  "assessment",
  "plan",
  "historyPresentIllness",
];
