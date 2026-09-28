"use client";

import Link from "next/link";
import { OperationalDashboard } from "@/components/dashboard/operational-dashboard";
import { useCurrentUser } from "@/features/auth/hooks";
import { getRoleHomePath } from "@/types/role";

export default function DashboardPage() {
  const { data: user } = useCurrentUser();

  if (!user) return null;

  const home = getRoleHomePath(user.role);

  return (
    <div className="space-y-4">
      {home !== "/dashboard" ? (
        <p className="text-sm text-slate-600">
          {user.firstName} ·{" "}
          <Link href={home} className="font-medium text-teal-700 underline">
            Open your primary workspace
          </Link>
        </p>
      ) : null}
      <OperationalDashboard />
    </div>
  );
}
