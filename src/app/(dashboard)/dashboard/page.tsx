"use client";

import Link from "next/link";
import { useCurrentUser } from "@/features/auth/hooks";
import { getRoleHomePath } from "@/types/role";

export default function DashboardPage() {
  const { data: user } = useCurrentUser();

  if (!user) return null;

  const home = getRoleHomePath(user.role);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">
          Welcome, {user.firstName}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {user.email} · {user.role.replaceAll("_", " ")}
        </p>
        {home !== "/dashboard" ? (
          <p className="mt-4 text-sm">
            <Link href={home} className="font-medium text-teal-700 underline">
              Open your primary workspace
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
