import { z } from "zod";

export const triageSchema = z.object({
  temperature: z.string().optional(),
  systolic: z.string().optional(),
  diastolic: z.string().optional(),
  heartRate: z.string().optional(),
  respiratoryRate: z.string().optional(),
  spo2: z.string().optional(),
  weightKg: z.string().optional(),
  heightCm: z.string().optional(),
  painScore: z.string().optional(),
  bloodGlucoseMgDl: z.string().optional(),
  notes: z.string().optional(),
});

export type TriageFormValues = z.infer<typeof triageSchema>;
