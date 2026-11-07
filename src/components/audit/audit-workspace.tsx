"use client";

import { Shield } from "lucide-react";
import { Card } from "@/components/ui/card";

export function AuditWorkspace() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Audit log</h1>
        <p className="text-sm text-muted">
          Read-only audit visibility for administrators.
        </p>
      </div>
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <Shield className="h-10 w-10 text-muted" aria-hidden />
        <p className="max-w-lg text-sm text-foreground">
          The backend records audit events internally (for example user create and
          status changes) but does not yet expose a{" "}
          <code className="rounded bg-muted-bg px-1">GET /audit-logs</code>{" "}
          API. This screen will list actor, action, entity, and timestamps when
          that endpoint is available.
        </p>
        <p className="text-xs text-muted">
          No audit data is shown here to avoid misleading frontend-only logs.
        </p>
      </Card>
    </div>
  );
}
