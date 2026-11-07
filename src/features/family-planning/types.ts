export type FpVisitType = "NEW" | "RETURNING" | "SWITCHING" | "FOLLOW_UP";

export type ContraceptiveMethod =
  | "IUCD"
  | "IMPLANT"
  | "INJECTABLE_DMPA"
  | "COC"
  | "POP"
  | "CONDOM_MALE"
  | "CONDOM_FEMALE"
  | "EMERGENCY"
  | "NATURAL"
  | "LAM"
  | "TUBAL_LIGATION"
  | "VASECTOMY"
  | "OTHER";

export type FpOutcome = "CONTINUE" | "DISCONTINUE" | "REMOVE" | "SWITCH";

export type FamilyPlanningRecord = {
  id: string;
  patientId: string;
  encounterId?: string | null;
  visitType?: FpVisitType | null;
  gravidity?: number | null;
  parity?: number | null;
  livingChildren?: number | null;
  previousMethod?: ContraceptiveMethod | null;
  currentMethod?: ContraceptiveMethod | null;
  pregnancyStatus?: string | null;
  systolic?: number | null;
  diastolic?: number | null;
  contraindications?: string | null;
  counselingDone?: boolean | null;
  counselingNotes?: string | null;
  procedureDate?: string | null;
  sideEffects?: string | null;
  nextAppointment?: string | null;
  outcome?: FpOutcome | null;
  createdAt?: string;
  updatedAt?: string;
};
