import { differenceInYears, subYears, format } from "date-fns";

/** Whole years from date of birth, or null if missing/invalid. */
export function ageYears(dob: string | Date | null | undefined): number | null {
  if (dob == null || dob === "") return null;
  const years = differenceInYears(new Date(), new Date(dob));
  if (!Number.isFinite(years) || years < 0) return null;
  return years;
}

/** Display label like "25 yrs", or null. */
export function formatAge(dob: string | Date | null | undefined): string | null {
  const years = ageYears(dob);
  if (years == null) return null;
  return years === 1 ? "1 yr" : `${years} yrs`;
}

/**
 * Approximate DOB from age in years (today minus N years).
 * Stored as dateOfBirth so age can be recomputed later.
 */
export function dateOfBirthFromAge(age: number): string {
  return format(subYears(new Date(), age), "yyyy-MM-dd");
}
