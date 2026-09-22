"use client";

import { Shield } from "lucide-react";
import { Card } from "@/components/ui/card";

export function AuditWorkspace() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Audit log</h1>
        <p className="text-sm text-slate-600">
          Read-only audit visibility for administrators.
        </p>
      </div>
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <Shield className="h-10 w-10 text-slate-400" aria-hidden />
        <p className="max-w-lg text-sm text-slate-700">
          The backend records audit events internally (for example user create and
          status changes) but does not yet expose a{" "}
          <code className="rounded bg-slate-100 px-1">GET /audit-logs</code>{" "}
          API. This screen will list actor, action, entity, and timestamps when
          that endpoint is available.
        </p>
        <p className="text-xs text-slate-500">
          No audit data is shown here to avoid misleading frontend-only logs.
        </p>
      </Card>
    </div>
  );
}
