import type { Role } from "./role";

export type AuthUserSummary = {
  id: string;
  email: string;
  role: Role;
};

export type UserProfile = AuthUserSummary & {
  phone: string | null;
  firstName: string;
  lastName: string;
  status: string;
  departmentId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthTokensResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUserSummary;
};
