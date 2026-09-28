import { Role, type Role as RoleType } from "@/types/role";

const DESK_BILLING: RoleType[] = [
  Role.CEO,
  Role.ADMIN,
  Role.CASHIER,
  Role.RECEPTIONIST,
  Role.FRONT_DESK,
];

const DESK_PAYMENT: RoleType[] = [
  Role.CEO,
  Role.ADMIN,
  Role.CASHIER,
  Role.RECEPTIONIST,
  Role.FRONT_DESK,
];

export function canRegisterPatient(role: RoleType): boolean {
  return (
    role === Role.CEO ||
    role === Role.ADMIN ||
    role === Role.RECEPTIONIST ||
    role === Role.FRONT_DESK
  );
}

export function canCreateInvoice(role: RoleType): boolean {
  return DESK_BILLING.includes(role);
}

export function canIssueInvoice(role: RoleType): boolean {
  return DESK_PAYMENT.includes(role);
}

export function canTakePayment(role: RoleType): boolean {
  return DESK_PAYMENT.includes(role);
}
