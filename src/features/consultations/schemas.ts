import { z } from "zod";
import { DiagnosisType } from "@/types/encounter";
import { obstetricUsReportSchema } from "./obstetric-us-report";
import { referralSheetSchema } from "./referral-sheet";

export const consultationSchema = z.object({
  chiefComplaint: z.string().optional(),
  historyPresentIllness: z.string().optional(),
  physicalExam: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  notes: z.string().optional(),
  labNotes: z.string().optional(),
  referralSheet: referralSheetSchema.optional().nullable(),
  obstetricUsReport: obstetricUsReportSchema.optional().nullable(),
});

export type ConsultationFormValues = z.infer<typeof consultationSchema>;

export const diagnosisSchema = z.object({
  label: z.string().min(2, "Diagnosis label required"),
  code: z.string().optional(),
  type: z
    .enum([
      DiagnosisType.PROVISIONAL,
      DiagnosisType.CONFIRMED,
      DiagnosisType.DIFFERENTIAL,
    ])
    .optional(),
  isPrimary: z.boolean().optional(),
  notes: z.string().optional(),
});

export type DiagnosisFormValues = z.infer<typeof diagnosisSchema>;
