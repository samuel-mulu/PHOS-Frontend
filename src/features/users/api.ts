import { api } from "@/lib/api/client";
import type {
  AdminUser,
  CreateUserInput,
  UpdateUserInput,
  UserStatus,
} from "@/types/user-admin";

export type DoctorOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: string | null;
};

export async function fetchUsers(search?: string) {
  const { data } = await api.get<AdminUser[]>("/users", {
    params: search ? { search } : undefined,
  });
  return data;
}

export async function fetchDoctors() {
  const { data } = await api.get<DoctorOption[]>("/users/doctors");
  return data;
}

export async function fetchUser(id: string) {
  const { data } = await api.get<AdminUser>(`/users/${id}`);
  return data;
}

export async function createUser(input: CreateUserInput) {
  const { data } = await api.post<AdminUser>("/users", input);
  return data;
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const { data } = await api.patch<AdminUser>(`/users/${id}`, input);
  return data;
}

export async function updateUserStatus(id: string, status: UserStatus) {
  const { data } = await api.patch<AdminUser>(`/users/${id}/status`, {
    status,
  });
  return data;
}
