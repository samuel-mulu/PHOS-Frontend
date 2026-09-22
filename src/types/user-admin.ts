import type { Role } from "@/types/role";

export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export type AdminUser = {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: Role;
  status: UserStatus;
  departmentId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateUserInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  phone?: string;
  departmentId?: string;
};

export type UpdateUserInput = {
  firstName?: string;
  lastName?: string;
  role?: Role;
  phone?: string;
  departmentId?: string;
};
