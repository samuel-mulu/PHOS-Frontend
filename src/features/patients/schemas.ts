import { format } from "date-fns";
import { z } from "zod";
import { ageYears } from "@/lib/format/age";
import { Sex, type Patient } from "@/types/patient";

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

export const birthInputModeSchema = z.enum(["age", "dateOfBirth"]);
export type BirthInputMode = z.infer<typeof birthInputModeSchema>;

export const createPatientSchema = z
  .object({
    firstName: z.string().trim().min(2, "First name is required"),
    middleName: optionalText,
    lastName: z.string().trim().min(2, "Last name is required"),
    sex: z.enum([Sex.MALE, Sex.FEMALE, Sex.OTHER, Sex.UNKNOWN]),
    birthInputMode: birthInputModeSchema.default("age"),
    age: optionalText,
    dateOfBirth: optionalText,
    phone: optionalText,
    email: optionalEmail,
    address: optionalText,
    governmentId: optionalText,
    emergencyContactName: optionalText,
    emergencyContactPhone: optionalText,
    allergies: optionalText,
  })
  .superRefine((data, ctx) => {
    if (data.birthInputMode === "age") {
      const raw = data.age?.trim();
      if (!raw) return;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0 || n > 150) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid age (0–150)",
          path: ["age"],
        });
      }
      return;
    }
    const dob = data.dateOfBirth?.trim();
    if (!dob) return;
    const parsed = new Date(dob);
    if (Number.isNaN(parsed.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid date of birth",
        path: ["dateOfBirth"],
      });
    }
  });

export type CreatePatientFormValues = z.infer<typeof createPatientSchema>;
export type PatientFormValues = CreatePatientFormValues;

export function patientToFormValues(patient: Patient): PatientFormValues {
  const years = ageYears(patient.dateOfBirth);
  return {
    firstName: patient.firstName,
    middleName: patient.middleName ?? "",
    lastName: patient.lastName,
    sex: patient.sex,
    birthInputMode: "age",
    age: years != null ? String(years) : "",
    dateOfBirth: patient.dateOfBirth
      ? format(new Date(patient.dateOfBirth), "yyyy-MM-dd")
      : "",
    phone: patient.phone ?? "",
    email: patient.email ?? "",
    address: patient.address ?? "",
    governmentId: patient.governmentId ?? "",
    emergencyContactName: patient.emergencyContactName ?? "",
    emergencyContactPhone: patient.emergencyContactPhone ?? "",
    allergies: patient.allergies ?? "",
  };
}
