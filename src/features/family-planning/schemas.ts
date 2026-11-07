import { z } from "zod";

export const CONTRACEPTIVE_METHODS = [
  "IUCD",
  "IMPLANT",
  "INJECTABLE_DMPA",
  "COC",
  "POP",
  "CONDOM_MALE",
  "CONDOM_FEMALE",
  "EMERGENCY",
  "NATURAL",
  "LAM",
  "TUBAL_LIGATION",
  "VASECTOMY",
  "OTHER",
] as const;

export const familyPlanningSchema = z.object({
  visitType: z
    .enum(["", "NEW", "RETURNING", "SWITCHING", "FOLLOW_UP"])
    .optional(),
  gravidity: z.string().optional(),
  parity: z.string().optional(),
  livingChildren: z.string().optional(),
  previousMethod: z.enum(["", ...CONTRACEPTIVE_METHODS]).optional(),
  currentMethod: z.enum(["", ...CONTRACEPTIVE_METHODS]).optional(),
  pregnancyStatus: z.string().optional(),
  systolic: z.string().optional(),
  diastolic: z.string().optional(),
  contraindications: z.string().optional(),
  counselingDone: z.boolean().nullable().optional(),
  counselingNotes: z.string().optional(),
  procedureDate: z.string().optional(),
  sideEffects: z.string().optional(),
  nextAppointment: z.string().optional(),
  outcome: z
    .enum(["", "CONTINUE", "DISCONTINUE", "REMOVE", "SWITCH"])
    .optional(),
  encounterId: z.string().optional(),
});

export type FamilyPlanningFormValues = z.infer<typeof familyPlanningSchema>;
