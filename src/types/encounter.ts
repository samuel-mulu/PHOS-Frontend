export const EncounterType = {
  WALK_IN: "WALK_IN",
  APPOINTMENT: "APPOINTMENT",
  FOLLOW_UP: "FOLLOW_UP",
  EMERGENCY: "EMERGENCY",
} as const;

export type EncounterType = (typeof EncounterType)[keyof typeof EncounterType];

export const EncounterPriority = {
  ROUTINE: "ROUTINE",
  URGENT: "URGENT",
  EMERGENCY: "EMERGENCY",
} as const;

export type EncounterPriority =
  (typeof EncounterPriority)[keyof typeof EncounterPriority];

export const QueueStation = {
  TRIAGE: "TRIAGE",
  DOCTOR: "DOCTOR",
  LAB: "LAB",
  PHARMACY: "PHARMACY",
  CASHIER: "CASHIER",
} as const;

export type QueueStation = (typeof QueueStation)[keyof typeof QueueStation];

export const DiagnosisType = {
  PROVISIONAL: "PROVISIONAL",
  CONFIRMED: "CONFIRMED",
  DIFFERENTIAL: "DIFFERENTIAL",
} as const;

export type DiagnosisType = (typeof DiagnosisType)[keyof typeof DiagnosisType];
