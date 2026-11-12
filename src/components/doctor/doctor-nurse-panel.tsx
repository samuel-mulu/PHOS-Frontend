"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClinicalNotesThread } from "@/components/shared/clinical-notes-thread";
import { useRequestNurse } from "@/features/encounters/hooks";
import { cn } from "@/lib/utils";

const QUICK_NOTES = [
  "Please record vitals and return.",
  "Maternal / ANC: check BP, weight, fundal height.",
  "Family planning: counseling / method support.",
];

export function DoctorNursePanel({
  encounterId,
  isFinalized,
  alreadyWithNurse,
  className,
}: {
  encounterId: string;
  isFinalized?: boolean;
  alreadyWithNurse?: boolean;
  className?: string;
}) {
  const requestNurse = useRequestNurse(encounterId);
  const [notes, setNotes] = useState("");

  const canSend =
    !isFinalized &&
    !alreadyWithNurse &&
    notes.trim().length > 0 &&
    !requestNurse.isPending;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Send to nurse / triage
        </h3>
        <p className="mt-1 text-xs text-slate-600">
          Patient leaves your queue, appears on the nurse board (badged as from
          doctor). Nurse can do vitals, Maternal, or FP, then return the
          patient. Intake triage waiting list is unchanged.
        </p>

        {alreadyWithNurse ? (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
            Patient is already with nurse / triage. They will return when the
            nurse completes the referral.
          </p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {QUICK_NOTES.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={isFinalized}
                  className="rounded-md bg-white px-2 py-1 text-2xs text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
                  onClick={() => setNotes(q)}
                >
                  {q}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <Label htmlFor="nurse-notes" className="text-xs">
                Notes for nurse
              </Label>
              <Textarea
                id="nurse-notes"
                className="mt-1"
                rows={3}
                disabled={isFinalized}
                placeholder="What should the nurse do? (vitals, ANC, FP…)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <Button
              type="button"
              className="mt-3"
              disabled={!canSend}
              onClick={() => requestNurse.mutate(notes.trim())}
            >
              {requestNurse.isPending
                ? "Sending…"
                : "Send to nurse / triage"}
            </Button>
          </>
        )}
      </div>

      <ClinicalNotesThread
        encounterId={encounterId}
        readOnly={isFinalized}
        title="Clinical notes (doctor ↔ nurse)"
      />
    </div>
  );
}
