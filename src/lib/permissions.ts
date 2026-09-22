import { Role, type Role as RoleType } from "@/types/role";

export function canRegisterPatient(role: RoleType): boolean {
  return (
    role === Role.CEO || role === Role.ADMIN || role === Role.RECEPTIONIST
  );
}
