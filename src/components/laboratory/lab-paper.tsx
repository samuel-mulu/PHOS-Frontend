"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { groupByPanel, paperTitle } from "@/lib/lab/panels";
import { LabResultFlag } from "@/types/lab";

export type LabPaperLine = {
  id: string;
  name: string;
  code: string;
  category: string | null;
  unit: string | null;
  referenceRange: string | null;
  sortOrder?: number;
  value?: string | null;
  flag?: string | null;
};

export function labItemsToPaperLines(
  items: Array<{
    id: string;
    labTest: {
      name: string;
      code: string;
      category: string | null;
      unit: string | null;
      referenceRange: string | null;
      sortOrder: number;
    };
    result?: {
      value?: string | null;
      unit?: string | null;
      referenceRange?: string | null;
      flag?: string | null;
    } | null;
  }>,
  drafts?: Record<string, { value?: string; flag?: string }>,
): LabPaperLine[] {
  return items.map((item) => ({
    id: item.id,
    name: item.labTest.name,
    code: item.labTest.code,
    category: item.labTest.category,
    unit: item.result?.unit ?? item.labTest.unit,
    referenceRange: item.result?.referenceRange ?? item.labTest.referenceRange,
    sortOrder: item.labTest.sortOrder,
    value: drafts?.[item.id]?.value ?? item.result?.value,
    flag: drafts?.[item.id]?.flag ?? item.result?.flag,
  }));
}

type Draft = { value: string; flag: string };

function flagClass(flag: string | null | undefined) {
  if (flag === "CRITICAL" || flag === "ABNORMAL") return "text-red-700 font-semibold";
  if (flag === "HIGH" || flag === "LOW") return "text-amber-800 font-semibold";
  if (flag === "NORMAL") return "text-emerald-800";
  return "text-muted";
}

export function LabPaper({
  lines,
  mode,
  drafts,
  onChange,
}: {
  lines: LabPaperLine[];
  mode: "view" | "edit";
  drafts?: Record<string, Draft>;
  onChange?: (id: string, patch: Partial<Draft>) => void;
}) {
  const groups = groupByPanel(
    lines,
    (l) => l.category,
    (l) => l.sortOrder ?? 0,
  );

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section
          key={group.category}
          className="overflow-hidden rounded-lg border border-border bg-card"
        >
          <h3 className="border-b border-border bg-muted-bg px-3 py-2 text-xs font-bold uppercase tracking-wide text-foreground">
            {paperTitle(group.category)}
          </h3>
          <div className="divide-y divide-border font-mono text-[calc(0.8125rem*var(--text-scale))]">
            {group.items.map((line) => {
              const draft = drafts?.[line.id];
              const value =
                mode === "edit"
                  ? (draft?.value ?? line.value ?? "")
                  : (line.value ?? "");
              const flag =
                mode === "edit"
                  ? (draft?.flag ?? line.flag ?? "")
                  : (line.flag ?? "");
              return (
                <div
                  key={line.id}
                  className="grid items-center gap-2 px-3 py-1.5 sm:grid-cols-[minmax(0,1.4fr)_minmax(5.5rem,0.7fr)_auto_minmax(0,1fr)]"
                >
                  <span className="font-sans text-sm text-foreground">
                    {line.name}
                    <span className="ml-1 text-3xs text-muted">
                      {line.code}
                    </span>
                  </span>
                  {mode === "edit" ? (
                    <Input
                      className="h-8 font-mono text-sm"
                      value={value}
                      placeholder="______"
                      onChange={(e) =>
                        onChange?.(line.id, { value: e.target.value })
                      }
                    />
                  ) : value ? (
                    <span className="min-h-8 border-b border-dotted border-slate-400 px-1 py-1 font-semibold tabular-nums text-foreground">
                      {value}
                    </span>
                  ) : (
                    <span className="min-h-8 px-1 py-1 text-xs font-sans italic text-muted">
                      Not added
                    </span>
                  )}
                  <span className="shrink-0 text-xs text-muted">
                    {line.unit ?? ""}
                  </span>
                  <span className="flex flex-wrap items-center justify-end gap-2 text-xs text-muted">
                    {line.referenceRange ? (
                      <span>({line.referenceRange})</span>
                    ) : null}
                    {mode === "edit" ? (
                      <select
                        className="h-8 rounded border border-border bg-card px-1 text-2xs"
                        value={flag}
                        onChange={(e) =>
                          onChange?.(line.id, { flag: e.target.value })
                        }
                      >
                        <option value="">Flag</option>
                        {Object.values(LabResultFlag).map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    ) : flag ? (
                      <span className={cn(flagClass(flag))}>{flag}</span>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
