"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { normalizeApiError } from "@/lib/api/errors";
import type { CreateUserInput, UpdateUserInput, UserStatus } from "@/types/user-admin";
import {
  createUser,
  fetchUsers,
  updateUser,
  updateUserStatus,
} from "./api";

export { useDoctors } from "./use-doctors";

export function useUsersList(search?: string) {
  return useQuery({
    queryKey: ["admin", "users", search ?? ""],
    queryFn: () => fetchUsers(search),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("User created");
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) =>
      updateUser(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("User updated");
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      updateUserStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("User status updated");
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });
}
