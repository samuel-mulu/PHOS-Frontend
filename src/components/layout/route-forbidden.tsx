"use client";

import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRoleHomePath } from "@/types/role";
import { useCurrentUser } from "@/features/auth/hooks";

export function RouteForbidden() {
  const { data: user } = useCurrentUser();
  const home = user ? getRoleHomePath(user.role) : "/login";

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-lg border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
      <ShieldOff className="h-10 w-10 text-amber-600" aria-hidden />
      <h1 className="text-lg font-semibold text-slate-900">Access denied</h1>
      <p className="text-sm text-slate-600">
        Your role does not include this workspace. The server may also return 403
        if you attempt restricted actions.
      </p>
      <Link href={home}>
        <Button type="button">Go to your workspace</Button>
      </Link>
    </div>
  );
}
