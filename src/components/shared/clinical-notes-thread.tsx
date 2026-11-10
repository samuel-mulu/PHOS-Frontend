"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LoadingBlock } from "@/components/shared/state-blocks";
import {
  useCreateClinicalMessage,
  useEncounterClinicalMessages,
} from "@/features/clinical-messages/hooks";
import {
  ClinicalMessageAuthorSide,
  ClinicalMessageKind,
  type ClinicalMessage,
} from "@/features/clinical-messages/types";
import { cn } from "@/lib/utils";

function kindLabel(kind: string) {
  if (kind === ClinicalMessageKind.LAB_ORDER) return "Lab order";
  if (kind === ClinicalMessageKind.LAB_RESULT) return "Lab result";
  return "Note";
}

function sideLabel(side: string) {
  return side === ClinicalMessageAuthorSide.LAB ? "Lab" : "Doctor";
}

function MessageBubble({ message }: { message: ClinicalMessage }) {
  const fromLab = message.authorSide === ClinicalMessageAuthorSide.LAB;
  const name = [message.author.firstName, message.author.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cn("flex", fromLab ? "justify-start" : "justify-end")}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm",
          fromLab
            ? "bg-slate-100 text-slate-900 ring-1 ring-slate-200"
            : "bg-teal-800 text-white",
        )}
      >
        <div
          className={cn(
            "mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-2xs",
            fromLab ? "text-slate-600" : "text-teal-100",
          )}
        >
          <span className="font-semibold">
            {sideLabel(message.authorSide)}
            {name ? ` · ${name}` : ""}
          </span>
          <span>{kindLabel(message.kind)}</span>
          {message.labOrder?.orderNumber ? (
            <span>{message.labOrder.orderNumber}</span>
          ) : null}
          <span>{format(new Date(message.createdAt), "HH:mm")}</span>
        </div>
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
      </div>
    </div>
  );
}

export function ClinicalNotesThread({
  encounterId,
  readOnly,
  title = "Clinical notes (doctor ↔ lab)",
  className,
  defaultKind = ClinicalMessageKind.NOTE,
  labOrderId,
}: {
  encounterId: string;
  readOnly?: boolean;
  title?: string;
  className?: string;
  defaultKind?: ClinicalMessageKind;
  labOrderId?: string;
}) {
  const messages = useEncounterClinicalMessages(encounterId);
  const create = useCreateClinicalMessage(encounterId);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.data?.length]);

  function send() {
    const body = draft.trim();
    if (!body || create.isPending) return;
    create.mutate(
      {
        body,
        kind: defaultKind,
        labOrderId,
      },
      {
        onSuccess: () => setDraft(""),
      },
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-border bg-card shadow-sm",
        className,
      )}
    >
      <div className="border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-2xs text-muted">
          Chat for this visit. Send a note only, or with a lab order / result.
        </p>
      </div>

      <div className="max-h-72 min-h-[10rem] space-y-2 overflow-y-auto px-3 py-3">
        {messages.isLoading ? (
          <LoadingBlock label="Loading clinical notes" />
        ) : messages.isError ? (
          <p className="text-xs text-red-600">Could not load clinical notes.</p>
        ) : (messages.data?.length ?? 0) === 0 ? (
          <p className="text-xs text-muted">
            No clinical notes yet for this visit.
          </p>
        ) : (
          messages.data?.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        <div ref={bottomRef} />
      </div>

      {!readOnly ? (
        <div className="space-y-2 border-t border-border px-3 py-3">
          <Textarea
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a clinical note…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-2xs text-muted">Enter to send · Shift+Enter newline</p>
            <Button
              type="button"
              size="sm"
              disabled={!draft.trim() || create.isPending}
              onClick={send}
            >
              {create.isPending ? "Sending…" : "Send note"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
