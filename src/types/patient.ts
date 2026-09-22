export const Sex = {
  MALE: "MALE",
  FEMALE: "FEMALE",
  OTHER: "OTHER",
  UNKNOWN: "UNKNOWN",
} as const;

export type Sex = (typeof Sex)[keyof typeof Sex];

export type Patient = {
  id: string;
  patientNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  sex: Sex;
  dateOfBirth: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  governmentId: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  allergies: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PatientDuplicateMatch = {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  dateOfBirth: string | null;
};

export type PaginatedPatients = {
  items: Patient[];
  total: number;
  page: number;
  limit: number;
};

export type PatientWithEncounters = Patient & {
  encounters: Array<{
    id: string;
    status: string;
    startedAt: string;
    type: string;
  }>;
};
