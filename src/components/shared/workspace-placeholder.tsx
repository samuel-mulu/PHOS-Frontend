export function WorkspacePlaceholder({
  title,
  phase,
}: {
  title: string;
  phase: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted">
        This workspace will be implemented in {phase}. Authentication and shell are
        ready.
      </p>
    </div>
  );
}
