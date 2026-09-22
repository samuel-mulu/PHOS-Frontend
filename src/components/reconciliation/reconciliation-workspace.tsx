"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingBlock } from "@/components/shared/state-blocks";
import {
  useCloseCashSession,
  useCurrentCashSession,
  useOpenCashSession,
} from "@/features/cash-sessions/hooks";
import { formatCents } from "@/lib/format/money";

export function ReconciliationWorkspace() {
  const session = useCurrentCashSession();
  const open = useOpenCashSession();
  const [floatCents, setFloatCents] = useState(0);

  const sessionId = session.data?.id ?? "";
  const close = useCloseCashSession(sessionId);
  const [actualCents, setActualCents] = useState(0);
  const [notes, setNotes] = useState("");

  const expectedPreview = useMemo(() => {
    if (!session.data) return null;
    const received =
      session.data.payments?.reduce((s, p) => s + p.amountCents, 0) ?? 0;
    return session.data.openingFloatCents + received;
  }, [session.data]);

  if (session.isLoading) return <LoadingBlock label="Loading session" />;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Cash reconciliation</h1>
        <p className="text-sm text-slate-600">
          Open and close cashier shifts. Expected cash is calculated on the server at close.
        </p>
      </div>

      {!session.data ? (
        <form
          className="space-y-3 rounded-lg border bg-white p-4 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            open.mutate(floatCents);
          }}
        >
          <h2 className="text-sm font-semibold">Open session</h2>
          <div>
            <Label className="text-xs">Opening float (cents)</Label>
            <Input
              type="number"
              min={0}
              value={floatCents}
              onChange={(e) => setFloatCents(Number(e.target.value))}
            />
          </div>
          <Button type="submit" disabled={open.isPending}>
            {open.isPending ? "Opening…" : "Open cash session"}
          </Button>
        </form>
      ) : (
        <div className="space-y-4 rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Active session</h2>
          <p className="text-sm text-slate-700">
            Opened {new Date(session.data.openedAt).toLocaleString()}
          </p>
          <p className="text-sm">
            Opening float: {formatCents(session.data.openingFloatCents)}
          </p>
          {expectedPreview !== null ? (
            <p className="text-sm text-teal-800">
              Estimated expected (float + cash payments, refunds netted on server):{" "}
              {formatCents(expectedPreview)}
            </p>
          ) : null}

          <form
            className="space-y-3 border-t pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              close.mutate({ actualCashCents: actualCents, notes: notes || undefined });
            }}
          >
            <h3 className="text-sm font-semibold">Close session</h3>
            <div>
              <Label className="text-xs">Actual cash counted (cents)</Label>
              <Input
                type="number"
                min={0}
                required
                value={actualCents}
                onChange={(e) => setActualCents(Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button type="submit" variant="default" disabled={close.isPending}>
              {close.isPending ? "Closing…" : "Close session"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
