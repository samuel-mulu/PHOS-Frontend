import { z } from "zod";
import { Sex } from "@/types/patient";

export const createPatientSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(2, "Last name is required"),
  sex: z.enum([Sex.MALE, Sex.FEMALE, Sex.OTHER, Sex.UNKNOWN]),
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  governmentId: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  allergies: z.string().optional(),
});

export type CreatePatientFormValues = z.infer<typeof createPatientSchema>;
