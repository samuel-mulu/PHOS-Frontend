/** Mirrors backend Prisma `Role` enum — keep in sync with phos-backend. */
export const Role = {
  CEO: "CEO",
  ADMIN: "ADMIN",
  DOCTOR: "DOCTOR",
  NURSE: "NURSE",
  LAB_TECH: "LAB_TECH",
  LAB_SUPERVISOR: "LAB_SUPERVISOR",
  PHARMACIST: "PHARMACIST",
  STOREKEEPER: "STOREKEEPER",
  RECEPTIONIST: "RECEPTIONIST",
  CASHIER: "CASHIER",
  FRONT_DESK: "FRONT_DESK",
  REPORTING_OFFICER: "REPORTING_OFFICER",
  IT_ADMIN: "IT_ADMIN",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export function getRoleHomePath(role: Role): string {
  switch (role) {
    case Role.RECEPTIONIST:
    case Role.FRONT_DESK:
      return "/front-desk";
    case Role.NURSE:
      return "/nurse";
    case Role.DOCTOR:
      return "/doctor";
    case Role.LAB_TECH:
    case Role.LAB_SUPERVISOR:
      return "/laboratory";
    case Role.PHARMACIST:
      return "/pharmacy";
    case Role.CASHIER:
      return "/front-desk";
    case Role.STOREKEEPER:
      return "/inventory";
    default:
      return "/dashboard";
  }
}
