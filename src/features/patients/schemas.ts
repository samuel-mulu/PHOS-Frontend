import { z } from "zod";
import { Sex } from "@/types/patient";

const optionalText = z.string().optional();

const optionalEmail = z
  .string()
  .optional()
  .refine(
    (v) =>
      v == null ||
      v.trim() === "" ||
      z.string().email().safeParse(v.trim()).success,
    { message: "Invalid email" },
  );

export const createPatientSchema = z.object({
  firstName: z.string().trim().min(2, "First name is required"),
  middleName: optionalText,
  lastName: z.string().trim().min(2, "Last name is required"),
  sex: z.enum([Sex.MALE, Sex.FEMALE, Sex.OTHER, Sex.UNKNOWN]),
  dateOfBirth: optionalText,
  phone: optionalText,
  email: optionalEmail,
  address: optionalText,
  governmentId: optionalText,
  emergencyContactName: optionalText,
  emergencyContactPhone: optionalText,
  allergies: optionalText,
});

export type CreatePatientFormValues = z.infer<typeof createPatientSchema>;
