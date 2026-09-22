import { api } from "@/lib/api/client";
import type { AuthTokensResponse, UserProfile } from "@/types/auth";
import type { LoginFormValues } from "./schemas";

export async function loginRequest(dto: LoginFormValues) {
  const { data } = await api.post<AuthTokensResponse>("/auth/login", dto);
  return data;
}

export async function refreshRequest(refreshToken: string) {
  const { data } = await api.post<AuthTokensResponse>("/auth/refresh", {
    refreshToken,
  });
  return data;
}

export async function logoutRequest(refreshToken: string) {
  await api.post("/auth/logout", { refreshToken });
}

export async function fetchCurrentUser() {
  const { data } = await api.get<UserProfile>("/users/me");
  return data;
}
